from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from threading import Lock
from threading import Thread
from time import perf_counter
from typing import Any
import joblib

import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.ensemble import (
    HistGradientBoostingClassifier,
    HistGradientBoostingRegressor,
    RandomForestClassifier,
    RandomForestRegressor,
)
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LinearRegression, LogisticRegression, Ridge
from sklearn.metrics import accuracy_score, f1_score, mean_absolute_error, mean_squared_error, r2_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler

from app import config
from app.services.constants import CATEGORICAL_COLS, CLUSTERING_FEATURES, EXCLUDE_COLS, PERSONA_DEFINITIONS
from app.services.feature_engineering import assign_generation, engineer_features


@dataclass
class TrainingState:
    ready: bool = False
    stage: str = "idle"
    progress: float = 0.0
    message: str = "Waiting to start"
    payloads: dict[str, Any] = field(default_factory=dict)
    models: dict[str, Any] = field(default_factory=dict)
    scaler: StandardScaler | None = None
    feature_columns: list[str] = field(default_factory=list)
    cluster_features: list[str] = field(default_factory=list)
    label_encoders: dict[str, LabelEncoder] = field(default_factory=dict)
    kmeans: KMeans | None = None
    cluster_scaler: StandardScaler | None = None
    raw_defaults: dict[str, Any] = field(default_factory=dict)


STATE = TrainingState()
BOOTSTRAP_LOCK = Lock()
TRAINING_LOCK = Lock()
BOOTSTRAP_COLUMNS = [
    "age",
    "gender",
    "country",
    "income_level",
    "employment_status",
    "education_level",
    "relationship_status",
    "daily_active_minutes_instagram",
    "sessions_per_day",
    "time_on_feed_per_day",
    "time_on_explore_per_day",
    "time_on_messages_per_day",
    "time_on_reels_per_day",
    "preferred_content_theme",
    "content_type_preference",
    "self_reported_happiness",
    "perceived_stress_score",
    "user_engagement_score",
]


class ModelNotReadyError(RuntimeError):
    pass


def _set_stage(stage: str, progress: float, message: str) -> None:
    STATE.stage = stage
    STATE.progress = progress
    STATE.message = message


def _artifact_path() -> Path:
    config.ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    return config.TRAINING_STATE_PATH


def _serialize_state() -> dict[str, Any]:
    return {
        "payloads": STATE.payloads,
        "models": STATE.models,
        "scaler": STATE.scaler,
        "feature_columns": STATE.feature_columns,
        "cluster_features": STATE.cluster_features,
        "label_encoders": STATE.label_encoders,
        "kmeans": STATE.kmeans,
        "cluster_scaler": STATE.cluster_scaler,
        "raw_defaults": STATE.raw_defaults,
    }


def _load_cached_state() -> bool:
    artifact_path = _artifact_path()
    if not artifact_path.exists():
        return False

    cached = joblib.load(artifact_path)
    STATE.payloads = cached["payloads"]
    STATE.models = cached["models"]
    STATE.scaler = cached["scaler"]
    STATE.feature_columns = cached["feature_columns"]
    STATE.cluster_features = cached["cluster_features"]
    STATE.label_encoders = cached["label_encoders"]
    STATE.kmeans = cached["kmeans"]
    STATE.cluster_scaler = cached["cluster_scaler"]
    STATE.raw_defaults = cached["raw_defaults"]
    STATE.ready = True
    _set_stage("ready", 1.0, "Loaded cached dashboard artifacts from disk")
    return True


def _persist_state() -> None:
    joblib.dump(_serialize_state(), _artifact_path())


def _reset_state() -> None:
    STATE.ready = False
    STATE.stage = "idle"
    STATE.progress = 0.0
    STATE.message = "Waiting to start"
    STATE.payloads = {}
    STATE.models = {}
    STATE.scaler = None
    STATE.feature_columns = []
    STATE.cluster_features = []
    STATE.label_encoders = {}
    STATE.kmeans = None
    STATE.cluster_scaler = None
    STATE.raw_defaults = {}


def _load_dataset() -> tuple[pd.DataFrame, pd.DataFrame]:
    df = pd.read_csv(config.DATASET_PATH)
    df["generation"] = df["age"].apply(assign_generation)
    df = engineer_features(df)
    sample_size = min(config.TRAINING_SAMPLE_SIZE, len(df))
    df_sample = df.sample(n=sample_size, random_state=config.RANDOM_STATE).copy()
    df_sample["generation"] = df_sample["age"].apply(assign_generation)
    return df, df_sample


def _build_bootstrap_payloads(
    df: pd.DataFrame,
    df_sample: pd.DataFrame,
    column_count: int,
) -> tuple[dict[str, Any], dict[str, Any]]:
    overview_payload = {
        "rows": int(len(df)),
        "columns": int(column_count),
        "avg_daily_minutes": float(df["daily_active_minutes_instagram"].mean()),
        "avg_happiness": float(df["self_reported_happiness"].mean()),
        "avg_stress": float(df["perceived_stress_score"].mean()),
        "high_addiction_risk_rate": 0.0,
        "countries": int(df["country"].nunique()),
        "targets": df[["self_reported_happiness", "perceived_stress_score", "user_engagement_score"]].describe().round(2).to_dict(),
    }
    eda_payload = {
        "age_histogram": df_sample["age"].value_counts().sort_index().to_dict(),
        "gender_distribution": df_sample["gender"].value_counts().to_dict(),
        "country_distribution": df_sample["country"].value_counts().head(20).to_dict(),
        "income_distribution": df_sample["income_level"].value_counts().to_dict(),
        "employment_distribution": df_sample["employment_status"].value_counts().to_dict(),
        "education_distribution": df_sample["education_level"].value_counts().to_dict(),
        "relationship_distribution": df_sample["relationship_status"].value_counts().to_dict(),
        "generation_distribution": df_sample["generation"].value_counts().to_dict(),
        "usage_by_generation": (
            df_sample.groupby("generation", observed=True)["daily_active_minutes_instagram"]
            .mean()
            .reindex([gen for gen in ["Gen Alpha", "Gen Z", "Millennial", "Gen X", "Boomer+"] if gen in df_sample["generation"].unique()])
            .round(2)
            .to_dict()
        ),
        "content_theme_distribution": df_sample["preferred_content_theme"].value_counts().head(15).to_dict(),
        "content_type_distribution": df_sample["content_type_preference"].value_counts().to_dict(),
        "usage_metrics": {
            "daily_active_minutes_instagram": float(df_sample["daily_active_minutes_instagram"].mean()),
            "sessions_per_day": float(df_sample["sessions_per_day"].mean()),
            "time_on_feed_per_day": float(df_sample["time_on_feed_per_day"].mean()),
            "time_on_explore_per_day": float(df_sample["time_on_explore_per_day"].mean()),
            "time_on_messages_per_day": float(df_sample["time_on_messages_per_day"].mean()),
            "time_on_reels_per_day": float(df_sample["time_on_reels_per_day"].mean()),
        },
    }
    return overview_payload, eda_payload


def _ensure_bootstrap_payloads() -> None:
    if "overview" in STATE.payloads and "eda" in STATE.payloads:
        return

    with BOOTSTRAP_LOCK:
        if "overview" in STATE.payloads and "eda" in STATE.payloads:
            return

        column_count = int(pd.read_csv(config.DATASET_PATH, nrows=0).shape[1])
        df = pd.read_csv(config.DATASET_PATH, usecols=BOOTSTRAP_COLUMNS)
        bootstrap_sample = df.sample(frac=config.BOOTSTRAP_SAMPLE_FRAC, random_state=config.RANDOM_STATE).copy()
        bootstrap_sample["generation"] = bootstrap_sample["age"].apply(assign_generation)
        overview_payload, eda_payload = _build_bootstrap_payloads(df, bootstrap_sample, column_count)
        STATE.payloads.setdefault("overview", overview_payload)
        STATE.payloads.setdefault("eda", eda_payload)

        if STATE.stage == "idle":
            _set_stage("warming_up", 0.02, "Lightweight dataset payloads are ready. Model-heavy sections are still warming up.")


def _build_model_frame(df_sample: pd.DataFrame) -> tuple[pd.DataFrame, list[str], dict[str, LabelEncoder]]:
    modeling_df = df_sample.copy()
    feature_cols = [
        col for col in modeling_df.columns if col not in EXCLUDE_COLS and modeling_df[col].dtype in ["int64", "float64"]
    ]

    label_encoders: dict[str, LabelEncoder] = {}
    for col in CATEGORICAL_COLS:
        if col in modeling_df.columns:
            encoder = LabelEncoder()
            encoded_col = f"{col}_encoded"
            modeling_df[encoded_col] = encoder.fit_transform(modeling_df[col].astype(str))
            label_encoders[col] = encoder
            feature_cols.append(encoded_col)

    feature_cols = sorted(set(feature_cols))
    return modeling_df, feature_cols, label_encoders


def _build_raw_defaults(dataframe: pd.DataFrame) -> dict[str, Any]:
    defaults: dict[str, Any] = {}
    for column in dataframe.columns:
        series = dataframe[column].dropna()
        if series.empty:
            defaults[column] = 0
        elif pd.api.types.is_numeric_dtype(series):
            defaults[column] = float(series.median())
        else:
            defaults[column] = series.mode().iloc[0]
    return defaults


def _encode_project_row(raw_features: dict[str, Any]) -> tuple[pd.DataFrame, pd.DataFrame]:
    baseline = STATE.raw_defaults.copy()
    baseline.update(raw_features)
    raw_row = pd.DataFrame([baseline])
    raw_row["generation"] = raw_row["age"].apply(assign_generation)
    engineered_row = engineer_features(raw_row)

    encoded = pd.Series(0.0, index=STATE.feature_columns, dtype=float)
    for column in STATE.feature_columns:
        if column in engineered_row.columns:
            value = engineered_row.iloc[0][column]
            try:
                encoded[column] = float(value)
            except (TypeError, ValueError):
                encoded[column] = 0.0

    for column, encoder in STATE.label_encoders.items():
        encoded_col = f"{column}_encoded"
        if encoded_col not in STATE.feature_columns or column not in engineered_row.columns:
            continue
        raw_value = str(engineered_row.iloc[0][column])
        classes = encoder.classes_.tolist()
        mapped = raw_value if raw_value in classes else classes[0]
        encoded[encoded_col] = float(encoder.transform([mapped])[0])

    return pd.DataFrame([encoded], columns=STATE.feature_columns), engineered_row


def _train_models(X_train: np.ndarray, X_test: np.ndarray, y_train: dict[str, pd.Series], y_test: dict[str, pd.Series]) -> tuple[dict[str, Any], list[dict[str, Any]], list[dict[str, Any]]]:
    regression_models = {
        "Linear Regression": LinearRegression(),
        "Ridge Regression": Ridge(alpha=1.0),
        "Random Forest Regressor": RandomForestRegressor(
            n_estimators=120,
            max_depth=12,
            min_samples_leaf=4,
            random_state=config.RANDOM_STATE,
            n_jobs=-1,
        ),
        "HistGradientBoosting Regressor": HistGradientBoostingRegressor(
            max_depth=10,
            learning_rate=0.08,
            random_state=config.RANDOM_STATE,
        ),
    }
    classification_models = {
        "Logistic Regression": LogisticRegression(max_iter=1000),
        "Random Forest Classifier": RandomForestClassifier(
            n_estimators=120,
            max_depth=12,
            min_samples_leaf=4,
            random_state=config.RANDOM_STATE,
            n_jobs=-1,
        ),
        "HistGradientBoosting Classifier": HistGradientBoostingClassifier(
            max_depth=10,
            learning_rate=0.08,
            random_state=config.RANDOM_STATE,
        ),
    }

    fitted_models: dict[str, Any] = {}
    regression_rows: list[dict[str, Any]] = []
    classification_rows: list[dict[str, Any]] = []

    for target_name in ["Self-Reported Happiness", "Perceived Stress Score", "User Engagement Score"]:
        for model_name, model in regression_models.items():
            start = perf_counter()
            fitted = clone(model)
            fitted.fit(X_train, y_train[target_name])
            predictions = fitted.predict(X_test)
            regression_rows.append(
                {
                    "task": target_name,
                    "algorithm": model_name,
                    "r2": float(r2_score(y_test[target_name], predictions)),
                    "rmse": float(mean_squared_error(y_test[target_name], predictions) ** 0.5),
                    "mae": float(mean_absolute_error(y_test[target_name], predictions)),
                    "fit_time_seconds": round(perf_counter() - start, 3),
                }
            )
            fitted_models[f"{target_name}::{model_name}"] = fitted

    class_target = "Social Media Addiction Risk"
    for model_name, model in classification_models.items():
        start = perf_counter()
        fitted = clone(model)
        fitted.fit(X_train, y_train[class_target])
        predictions = fitted.predict(X_test)
        probabilities = fitted.predict_proba(X_test)[:, 1] if hasattr(fitted, "predict_proba") else predictions.astype(float)
        classification_rows.append(
            {
                "task": class_target,
                "algorithm": model_name,
                "accuracy": float(accuracy_score(y_test[class_target], predictions)),
                "f1": float(f1_score(y_test[class_target], predictions)),
                "roc_auc": float(roc_auc_score(y_test[class_target], probabilities)),
                "fit_time_seconds": round(perf_counter() - start, 3),
            }
        )
        fitted_models[f"{class_target}::{model_name}"] = fitted

    return fitted_models, regression_rows, classification_rows


def _build_feature_importance(best_models: dict[str, Any], X_test: np.ndarray, feature_names: list[str], y_test: dict[str, pd.Series]) -> dict[str, list[dict[str, float | str]]]:
    rng = np.random.default_rng(config.RANDOM_STATE)
    sample_size = min(config.IMPORTANCE_SAMPLE_SIZE, X_test.shape[0])
    importance_idx = rng.choice(X_test.shape[0], size=sample_size, replace=False)
    X_importance = X_test[importance_idx]
    specs = {
        "Self-Reported Happiness": ("r2", y_test["Self-Reported Happiness"].iloc[importance_idx]),
        "Perceived Stress Score": ("r2", y_test["Perceived Stress Score"].iloc[importance_idx]),
        "User Engagement Score": ("r2", y_test["User Engagement Score"].iloc[importance_idx]),
        "Social Media Addiction Risk": ("roc_auc", y_test["Social Media Addiction Risk"].iloc[importance_idx]),
    }
    result: dict[str, list[dict[str, float | str]]] = {}
    for target_name, (scoring_name, y_subset) in specs.items():
        importance = permutation_importance(
            best_models[target_name],
            X_importance,
            y_subset,
            n_repeats=5,
            random_state=config.RANDOM_STATE,
            scoring=scoring_name,
            n_jobs=-1,
        )
        top_df = (
            pd.DataFrame({"feature": feature_names, "importance": importance.importances_mean})
            .sort_values("importance", ascending=False)
            .head(12)
        )
        result[target_name] = top_df.to_dict(orient="records")
    return result


def _encode_input(features: dict[str, Any], medians: pd.Series) -> pd.DataFrame:
    row = medians.to_dict()
    row.update(features)
    return pd.DataFrame([row])


def ensure_trained() -> None:
    if STATE.ready:
        return

    with TRAINING_LOCK:
        if STATE.ready:
            return
        if _load_cached_state():
            return

        _set_stage("loading", 0.1, "Loading and engineering notebook features")
        _, df_sample = _load_dataset()
        raw_defaults = _build_raw_defaults(df_sample)

        _set_stage("preparing", 0.25, "Preparing model matrix and dashboard payloads")
        modeling_df, feature_cols, label_encoders = _build_model_frame(df_sample)
        X = modeling_df[feature_cols].replace([float("inf"), float("-inf")], 0).fillna(0)
        y_targets = {
            "Self-Reported Happiness": modeling_df["self_reported_happiness"],
            "Perceived Stress Score": modeling_df["perceived_stress_score"],
            "User Engagement Score": modeling_df["user_engagement_score"],
            "Social Media Addiction Risk": (modeling_df["addiction_risk_score"] >= 50).astype(int),
        }
        train_idx, test_idx = train_test_split(
            modeling_df.index,
            test_size=config.TEST_SIZE,
            random_state=config.RANDOM_STATE,
            stratify=y_targets["Social Media Addiction Risk"],
        )
        scaler = StandardScaler()
        X_train = scaler.fit_transform(X.loc[train_idx])
        X_test = scaler.transform(X.loc[test_idx])
        y_train = {name: values.loc[train_idx] for name, values in y_targets.items()}
        y_test = {name: values.loc[test_idx] for name, values in y_targets.items()}

        _set_stage("training", 0.55, "Training comparison models")
        fitted_models, regression_rows, classification_rows = _train_models(X_train, X_test, y_train, y_test)
        regression_df = pd.DataFrame(regression_rows)
        classification_df = pd.DataFrame(classification_rows)
        best_regression = regression_df.sort_values(["task", "r2"], ascending=[True, False]).groupby("task", as_index=False).first()
        best_classification = classification_df.sort_values("roc_auc", ascending=False).head(1)
        best_models = {
            task: fitted_models[f"{task}::{algorithm}"]
            for task, algorithm in zip(best_regression["task"], best_regression["algorithm"])
        }
        best_models["Social Media Addiction Risk"] = fitted_models[
            f"Social Media Addiction Risk::{best_classification.iloc[0]['algorithm']}"
        ]

        _set_stage("clustering", 0.72, "Computing persona clustering and PCA")
        cluster_frame = df_sample[CLUSTERING_FEATURES].copy().fillna(df_sample[CLUSTERING_FEATURES].median(numeric_only=True))
        cluster_scaler = StandardScaler()
        X_cluster = cluster_scaler.fit_transform(cluster_frame)
        kmeans = KMeans(n_clusters=config.N_CLUSTERS, random_state=config.RANDOM_STATE, n_init=10, max_iter=300)
        clusters = kmeans.fit_predict(X_cluster)
        pca = PCA(n_components=2, random_state=config.RANDOM_STATE)
        X_pca = pca.fit_transform(X_cluster)
        df_sample = df_sample.copy()
        df_sample["cluster"] = clusters
        df_sample["persona"] = df_sample["cluster"].map(lambda x: PERSONA_DEFINITIONS[int(x)]["name"])

        _set_stage("summarizing", 0.88, "Building dashboard payloads")
        persona_counts = df_sample["persona"].value_counts(normalize=True).mul(100).round(2)
        cluster_profiles = df_sample.groupby("cluster", observed=True)[CLUSTERING_FEATURES].mean().round(2)
        pca_sample = pd.DataFrame(
            {
                "pc1": X_pca[:, 0],
                "pc2": X_pca[:, 1],
                "cluster": clusters,
                "persona": df_sample["persona"].values,
            }
        ).sample(min(config.PCA_SAMPLE_SIZE, len(df_sample)), random_state=config.RANDOM_STATE)

        overview_payload = {
            "rows": int(len(modeling_df)),
            "columns": int(modeling_df.shape[1]),
            "avg_daily_minutes": float(df_sample["daily_active_minutes_instagram"].mean()),
            "avg_happiness": float(df_sample["self_reported_happiness"].mean()),
            "avg_stress": float(df_sample["perceived_stress_score"].mean()),
            "high_addiction_risk_rate": float(((df_sample["addiction_risk_score"] >= 50).mean()) * 100),
            "countries": int(df_sample["country"].nunique()),
            "targets": df_sample[["self_reported_happiness", "perceived_stress_score", "user_engagement_score"]].describe().round(2).to_dict(),
        }
        eda_payload = {
            "age_histogram": df_sample["age"].value_counts().sort_index().to_dict(),
            "gender_distribution": df_sample["gender"].value_counts().to_dict(),
            "country_distribution": df_sample["country"].value_counts().head(20).to_dict(),
            "income_distribution": df_sample["income_level"].value_counts().to_dict(),
            "employment_distribution": df_sample["employment_status"].value_counts().to_dict(),
            "education_distribution": df_sample["education_level"].value_counts().to_dict(),
            "relationship_distribution": df_sample["relationship_status"].value_counts().to_dict(),
            "generation_distribution": df_sample["generation"].value_counts().reindex(df_sample["generation"].value_counts().index).to_dict(),
            "usage_by_generation": (
                df_sample.groupby("generation", observed=True)["daily_active_minutes_instagram"].mean().reindex([
                    gen for gen in ["Gen Alpha", "Gen Z", "Millennial", "Gen X", "Boomer+"] if gen in df_sample["generation"].unique()
                ]).round(2).to_dict()
            ),
            "content_theme_distribution": df_sample["preferred_content_theme"].value_counts().head(15).to_dict(),
            "content_type_distribution": df_sample["content_type_preference"].value_counts().to_dict(),
            "usage_metrics": {
                "daily_active_minutes_instagram": float(df_sample["daily_active_minutes_instagram"].mean()),
                "sessions_per_day": float(df_sample["sessions_per_day"].mean()),
                "time_on_feed_per_day": float(df_sample["time_on_feed_per_day"].mean()),
                "time_on_explore_per_day": float(df_sample["time_on_explore_per_day"].mean()),
                "time_on_messages_per_day": float(df_sample["time_on_messages_per_day"].mean()),
                "time_on_reels_per_day": float(df_sample["time_on_reels_per_day"].mean()),
            },
        }
        cluster_payload = {
            "share_by_persona": persona_counts.to_dict(),
            "cluster_profiles": cluster_profiles.reset_index().to_dict(orient="records"),
            "pca_sample": pca_sample.to_dict(orient="records"),
            "definitions": PERSONA_DEFINITIONS,
        }
        models_payload = {
            "regression": regression_rows,
            "classification": classification_rows,
            "best_regression": best_regression.to_dict(orient="records"),
            "best_classification": best_classification.to_dict(orient="records"),
        }
        cohort_analysis = (
            df_sample.groupby("account_creation_year", observed=True)
            .agg(
                avg_minutes=("daily_active_minutes_instagram", "mean"),
                avg_happiness=("self_reported_happiness", "mean"),
                avg_stress=("perceived_stress_score", "mean"),
                avg_followers=("followers_count", "mean"),
                users=("user_id", "count"),
            )
            .round(2)
            .reset_index()
            .sort_values("account_creation_year")
        )
        country_analysis = (
            df_sample.groupby("country", observed=True)
            .agg(
                avg_minutes=("daily_active_minutes_instagram", "mean"),
                avg_happiness=("self_reported_happiness", "mean"),
                avg_stress=("perceived_stress_score", "mean"),
                avg_engagement=("user_engagement_score", "mean"),
                user_count=("user_id", "count"),
            )
            .round(2)
            .reset_index()
            .sort_values("user_count", ascending=False)
            .head(20)
        )
        urban_rural = (
            df_sample.groupby("urban_rural", observed=True)
            .agg(
                avg_minutes=("daily_active_minutes_instagram", "mean"),
                avg_happiness=("self_reported_happiness", "mean"),
                avg_stress=("perceived_stress_score", "mean"),
                avg_engagement=("user_engagement_score", "mean"),
                users=("user_id", "count"),
            )
            .round(2)
            .reset_index()
        )
        stress_quantiles = pd.qcut(
            df_sample["perceived_stress_score"],
            q=3,
            labels=["Lower Stress", "Middle Stress", "Higher Stress"],
            duplicates="drop",
        )
        usage_quantiles = pd.qcut(
            df_sample["daily_active_minutes_instagram"],
            q=4,
            labels=["Light", "Moderate", "Heavy", "Very Heavy"],
            duplicates="drop",
        )
        stratified = (
            df_sample.assign(stress_group=stress_quantiles, usage_group=usage_quantiles)
            .groupby(["stress_group", "usage_group"], observed=True)
            .agg(avg_happiness=("self_reported_happiness", "mean"), users=("user_id", "count"))
            .round(2)
            .reset_index()
        )
        advanced_payload = {
            "cohort_analysis": cohort_analysis.to_dict(orient="records"),
            "country_analysis": country_analysis.to_dict(orient="records"),
            "urban_rural": urban_rural.to_dict(orient="records"),
            "stratified_happiness": stratified.to_dict(orient="records"),
            "summary": {
                "usage_happiness_corr": float(df_sample["daily_active_minutes_instagram"].corr(df_sample["self_reported_happiness"])),
                "usage_stress_corr": float(df_sample["daily_active_minutes_instagram"].corr(df_sample["perceived_stress_score"])),
                "top_usage_country": country_analysis.iloc[0]["country"] if not country_analysis.empty else None,
                "top_usage_cohort": int(cohort_analysis.sort_values("avg_minutes", ascending=False).iloc[0]["account_creation_year"]) if not cohort_analysis.empty else None,
            },
        }
        feature_importance = _build_feature_importance(best_models, X_test, feature_cols, y_test)

        STATE.payloads.update(
            {
                "overview": overview_payload,
                "eda": eda_payload,
                "clusters": cluster_payload,
                "advanced": advanced_payload,
                "models": models_payload,
                "feature_importance": feature_importance,
            }
        )
        STATE.models = best_models
        STATE.scaler = scaler
        STATE.feature_columns = feature_cols
        STATE.cluster_features = CLUSTERING_FEATURES
        STATE.label_encoders = label_encoders
        STATE.kmeans = kmeans
        STATE.cluster_scaler = cluster_scaler
        STATE.raw_defaults = raw_defaults
        _persist_state()
        STATE.ready = True
        _set_stage("ready", 1.0, "Dashboard payloads and models are ready")


def _get_payload(name: str) -> Any:
    if name in {"overview", "eda"}:
        _ensure_bootstrap_payloads()
        return STATE.payloads[name]
    if not STATE.ready:
        raise ModelNotReadyError("This section depends on trained models and is still warming up. Check the status pill and try again shortly.")
    return STATE.payloads[name]


def get_status() -> dict[str, Any]:
    return {
        "ready": STATE.ready,
        "stage": STATE.stage,
        "progress": STATE.progress,
        "message": STATE.message,
    }


def retrain_async() -> dict[str, Any]:
    artifact_path = _artifact_path()
    if artifact_path.exists():
        artifact_path.unlink()

    with TRAINING_LOCK:
        _reset_state()
        _set_stage("warming_up", 0.01, "Retraining requested. Fresh artifacts are being rebuilt in the background.")

    Thread(target=ensure_trained, daemon=True).start()
    return get_status()


def get_overview() -> dict[str, Any]:
    return _get_payload("overview")


def get_eda() -> dict[str, Any]:
    return _get_payload("eda")


def get_clusters() -> dict[str, Any]:
    return _get_payload("clusters")


def get_advanced() -> dict[str, Any]:
    return _get_payload("advanced")


def get_models() -> dict[str, Any]:
    return _get_payload("models")


def get_feature_importance(target: str) -> list[dict[str, float | str]]:
    return _get_payload("feature_importance").get(target, [])


# Columns surfaced by /api/dataset/feature-schema. Keep this focused on what the
# Predict console actually uses so we don't read the whole 58-column dataset.
_SCHEMA_NUMERIC_COLS = [
    "age",
    "daily_active_minutes_instagram",
    "sessions_per_day",
    "sleep_hours_per_night",
    "exercise_hours_per_week",
    "notification_response_rate",
    "followers_count",
    "following_count",
    "reels_watched_per_day",
    "stories_viewed_per_day",
    "posts_created_per_week",
    "likes_given_per_day",
    "comments_written_per_day",
    "dms_sent_per_week",
    "dms_received_per_week",
]

_SCHEMA_CATEGORICAL_COLS = [
    "gender",
    "country",
    "urban_rural",
    "income_level",
    "employment_status",
    "education_level",
    "relationship_status",
    "content_type_preference",
    "preferred_content_theme",
]

_FEATURE_SCHEMA_CACHE: dict[str, Any] | None = None
_FEATURE_SCHEMA_LOCK = Lock()


def _compute_feature_schema() -> dict[str, Any]:
    """Build the Predict-console schema from the CSV without loading the whole dataset."""
    usecols = [col for col in {*_SCHEMA_NUMERIC_COLS, *_SCHEMA_CATEGORICAL_COLS} if col]
    df = pd.read_csv(config.DATASET_PATH, usecols=usecols)

    numeric: dict[str, dict[str, float]] = {}
    for col in _SCHEMA_NUMERIC_COLS:
        if col not in df.columns:
            continue
        series = pd.to_numeric(df[col], errors="coerce").dropna()
        if series.empty:
            continue
        numeric[col] = {
            "min": float(series.min()),
            "max": float(series.max()),
            "median": float(series.median()),
            "p25": float(series.quantile(0.25)),
            "p75": float(series.quantile(0.75)),
        }

    categorical: dict[str, list[str]] = {}
    for col in _SCHEMA_CATEGORICAL_COLS:
        if col not in df.columns:
            continue
        values = [str(v) for v in df[col].dropna().unique().tolist()]
        values.sort()
        categorical[col] = values

    return {"numeric": numeric, "categorical": categorical}


def get_feature_schema() -> dict[str, Any]:
    global _FEATURE_SCHEMA_CACHE
    if _FEATURE_SCHEMA_CACHE is not None:
        return _FEATURE_SCHEMA_CACHE
    with _FEATURE_SCHEMA_LOCK:
        if _FEATURE_SCHEMA_CACHE is None:
            _FEATURE_SCHEMA_CACHE = _compute_feature_schema()
    return _FEATURE_SCHEMA_CACHE


def predict(features: dict[str, Any]) -> dict[str, Any]:
    if not STATE.ready:
        raise ModelNotReadyError("Predictions are unavailable until the trained models finish warming up.")
    assert STATE.scaler is not None
    assert STATE.kmeans is not None
    assert STATE.cluster_scaler is not None

    encoded_row, engineered_row = _encode_project_row(features)
    X_input = STATE.scaler.transform(encoded_row)
    predictions = [
        {"target": "Self-Reported Happiness", "value": float(STATE.models["Self-Reported Happiness"].predict(X_input)[0])},
        {"target": "Perceived Stress Score", "value": float(STATE.models["Perceived Stress Score"].predict(X_input)[0])},
        {"target": "User Engagement Score", "value": float(STATE.models["User Engagement Score"].predict(X_input)[0])},
        {
            "target": "Social Media Addiction Risk",
            "value": float(STATE.models["Social Media Addiction Risk"].predict_proba(X_input)[0, 1]),
        },
    ]

    cluster_vector = engineered_row[STATE.cluster_features].fillna(0)
    cluster_scaled = STATE.cluster_scaler.transform(cluster_vector)
    cluster_id = int(STATE.kmeans.predict(cluster_scaled)[0])
    persona_name = PERSONA_DEFINITIONS.get(cluster_id, {"name": "Unknown"})["name"]

    return {
        "predictions": predictions,
        "nearest_persona": persona_name,
        "cluster_id": cluster_id,
    }


def predict_batch(dataframe: pd.DataFrame) -> pd.DataFrame:
    """Vectorized scoring for a whole batch of project-schema rows.

    Returns a DataFrame with the same index as the input plus the predicted
    targets, cluster_id, and nearest_persona columns. This is dramatically
    faster than calling :func:`predict` row by row on large uploads.
    """
    if not STATE.ready:
        raise ModelNotReadyError("Predictions are unavailable until the trained models finish warming up.")
    assert STATE.scaler is not None
    assert STATE.kmeans is not None
    assert STATE.cluster_scaler is not None

    batch = dataframe.copy()
    for column, default in STATE.raw_defaults.items():
        if column not in batch.columns:
            batch[column] = default
        else:
            batch[column] = batch[column].where(batch[column].notna(), default)

    batch["generation"] = batch["age"].apply(assign_generation)
    engineered = engineer_features(batch)

    encoded = pd.DataFrame(0.0, index=engineered.index, columns=STATE.feature_columns)
    for column in STATE.feature_columns:
        if column in engineered.columns:
            encoded[column] = pd.to_numeric(engineered[column], errors="coerce").fillna(0.0).astype(float)

    for column, encoder in STATE.label_encoders.items():
        encoded_col = f"{column}_encoded"
        if encoded_col not in STATE.feature_columns or column not in engineered.columns:
            continue
        classes = encoder.classes_.tolist()
        fallback = classes[0]
        raw_values = engineered[column].astype(str)
        safe_values = raw_values.where(raw_values.isin(classes), fallback)
        encoded[encoded_col] = encoder.transform(safe_values).astype(float)

    X_input = STATE.scaler.transform(encoded.values)
    happiness = STATE.models["Self-Reported Happiness"].predict(X_input)
    stress = STATE.models["Perceived Stress Score"].predict(X_input)
    engagement = STATE.models["User Engagement Score"].predict(X_input)
    addiction = STATE.models["Social Media Addiction Risk"].predict_proba(X_input)[:, 1]

    cluster_matrix = engineered[STATE.cluster_features].fillna(0).values
    cluster_scaled = STATE.cluster_scaler.transform(cluster_matrix)
    cluster_ids = STATE.kmeans.predict(cluster_scaled)
    persona_names = [PERSONA_DEFINITIONS.get(int(cid), {"name": "Unknown"})["name"] for cid in cluster_ids]

    return pd.DataFrame(
        {
            "predicted_self_reported_happiness": happiness.astype(float),
            "predicted_perceived_stress_score": stress.astype(float),
            "predicted_user_engagement_score": engagement.astype(float),
            "predicted_social_media_addiction_risk": addiction.astype(float),
            "cluster_id": cluster_ids.astype(int),
            "nearest_persona": persona_names,
        },
        index=engineered.index,
    )

