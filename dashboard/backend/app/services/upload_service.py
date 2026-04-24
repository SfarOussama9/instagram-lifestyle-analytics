from __future__ import annotations

import hashlib
import io
from dataclasses import dataclass
from time import perf_counter
from typing import Any

import pandas as pd
from sklearn.base import clone
from sklearn.ensemble import HistGradientBoostingClassifier, HistGradientBoostingRegressor, RandomForestClassifier, RandomForestRegressor
from sklearn.linear_model import LinearRegression, LogisticRegression, Ridge
from sklearn.metrics import accuracy_score, f1_score, mean_absolute_error, mean_squared_error, r2_score, roc_auc_score
from sklearn.model_selection import train_test_split

from app import config
from app.services.feature_engineering import engineer_features
from app.services.training import predict_batch as predict_project_batch


@dataclass
class UploadArtifact:
    model: Any
    columns: list[str]
    task_type: str
    target: str
    metrics: list[dict[str, Any]]
    numeric_summary: dict[str, Any]


UPLOAD_DATASETS: dict[str, pd.DataFrame] = {}
UPLOAD_ARTIFACTS: dict[str, UploadArtifact] = {}
INSTAGRAM_UPLOAD_ROW_LIMIT = 10_000
INSTAGRAM_USAGE_BUCKETS = [0, 30, 60, 120, 180, float("inf")]
INSTAGRAM_USAGE_LABELS = ["Light (<30m)", "Moderate (30-60m)", "Heavy (1-2h)", "Very Heavy (2-3h)", "Extreme (3h+)"]
PROJECT_SCHEMA_EXCLUDE = {"user_id", "app_name", "self_reported_happiness", "perceived_stress_score", "user_engagement_score"}
PROJECT_READY_COLUMNS = [
    column
    for column in pd.read_csv(config.DATASET_PATH, nrows=0).columns.tolist()
    if column not in PROJECT_SCHEMA_EXCLUDE
]


def _validate_project_ready_upload(df: pd.DataFrame) -> None:
    missing_columns = [column for column in PROJECT_READY_COLUMNS if column not in df.columns]
    if missing_columns:
        preview = ", ".join(missing_columns[:12])
        suffix = "" if len(missing_columns) <= 12 else f", ... (+{len(missing_columns) - 12} more)"
        raise ValueError(
            "This CSV is not compatible with the project scoring pipeline. "
            f"Missing required Instagram columns: {preview}{suffix}."
        )


def _flatten_prediction_payload(prediction_payload: dict[str, Any]) -> dict[str, Any]:
    target_map = {
        "Self-Reported Happiness": "predicted_self_reported_happiness",
        "Perceived Stress Score": "predicted_perceived_stress_score",
        "User Engagement Score": "predicted_user_engagement_score",
        "Social Media Addiction Risk": "predicted_social_media_addiction_risk",
    }
    flattened = {
        "nearest_persona": prediction_payload["nearest_persona"],
        "cluster_id": int(prediction_payload["cluster_id"]),
    }
    for item in prediction_payload["predictions"]:
        column_name = target_map.get(item["target"])
        if column_name:
            flattened[column_name] = float(item["value"])
    return flattened


def _build_country_summary(scored_df: pd.DataFrame, top_n: int = 10) -> list[dict[str, Any]]:
    if "country" not in scored_df.columns:
        return []
    top_countries = scored_df["country"].value_counts().head(top_n).index.tolist()
    subset = scored_df[scored_df["country"].isin(top_countries)]
    summary = (
        subset.groupby("country", observed=True)
        .agg(
            users=("predicted_perceived_stress_score", "size"),
            avg_predicted_stress=("predicted_perceived_stress_score", "mean"),
            avg_predicted_happiness=("predicted_self_reported_happiness", "mean"),
            avg_predicted_engagement=("predicted_user_engagement_score", "mean"),
            high_addiction_rate=(
                "predicted_social_media_addiction_risk",
                lambda values: float((values >= 0.5).mean() * 100),
            ),
        )
        .reindex(top_countries)
        .reset_index()
    )
    summary = summary.round(2)
    summary["users"] = summary["users"].astype(int)
    return summary.to_dict(orient="records")


def _build_addiction_distribution(series: pd.Series) -> list[dict[str, Any]]:
    bins = [0, 0.2, 0.4, 0.6, 0.8, 1.01]
    labels = ["Very Low", "Low", "Moderate", "High", "Severe"]
    bucketed = pd.cut(series.clip(0, 1), bins=bins, labels=labels, include_lowest=True, right=False)
    counts = bucketed.value_counts(sort=False, dropna=False)
    return [{"bucket": str(label), "count": int(counts.get(label, 0))} for label in labels]


def _build_persona_outcome_matrix(scored_df: pd.DataFrame) -> list[dict[str, Any]]:
    grouped = (
        scored_df.groupby("nearest_persona", observed=True)
        .agg(
            users=("predicted_perceived_stress_score", "size"),
            avg_predicted_stress=("predicted_perceived_stress_score", "mean"),
            avg_predicted_happiness=("predicted_self_reported_happiness", "mean"),
            avg_predicted_engagement=("predicted_user_engagement_score", "mean"),
            avg_addiction_risk=("predicted_social_media_addiction_risk", "mean"),
        )
        .reset_index()
        .sort_values("users", ascending=False)
    )
    grouped = grouped.round(3)
    grouped["users"] = grouped["users"].astype(int)
    return grouped.to_dict(orient="records")


def _build_engagement_summary(scored_df: pd.DataFrame) -> list[dict[str, Any]]:
    bins = [-float("inf"), 20, 40, 60, 80, float("inf")]
    labels = ["Low", "Below avg", "Average", "Above avg", "High"]
    bucketed = pd.cut(
        scored_df["predicted_user_engagement_score"],
        bins=bins,
        labels=labels,
        include_lowest=True,
    )
    counts = bucketed.value_counts(sort=False, dropna=False)
    return [{"bucket": str(label), "count": int(counts.get(label, 0))} for label in labels]


def _build_distribution(series: pd.Series, bins: list[float], labels: list[str]) -> list[dict[str, Any]]:
    bucketed = pd.cut(series, bins=bins, labels=labels, include_lowest=True, right=False)
    counts = bucketed.value_counts(sort=False, dropna=False)
    return [{"bucket": str(label), "count": int(counts.get(label, 0))} for label in labels]


def _build_happiness_distribution(series: pd.Series) -> list[dict[str, Any]]:
    rounded = series.round().clip(1, 10)
    counts = rounded.value_counts().sort_index()
    return [{"bucket": str(score), "count": int(counts.get(score, 0))} for score in range(1, 11)]


def _build_usage_stress_summary(scored_df: pd.DataFrame) -> list[dict[str, Any]]:
    usage_bucket = pd.cut(
        scored_df["daily_active_minutes_instagram"],
        bins=INSTAGRAM_USAGE_BUCKETS,
        labels=INSTAGRAM_USAGE_LABELS,
        include_lowest=True,
        right=False,
    )
    summary = (
        scored_df.assign(usage_bucket=usage_bucket)
        .groupby("usage_bucket", observed=True)
        .agg(
            avg_predicted_stress=("predicted_perceived_stress_score", "mean"),
            avg_predicted_happiness=("predicted_self_reported_happiness", "mean"),
            rows=("predicted_perceived_stress_score", "size"),
        )
        .reindex(INSTAGRAM_USAGE_LABELS)
        .fillna(0)
        .reset_index()
    )
    summary["avg_predicted_stress"] = summary["avg_predicted_stress"].round(2)
    summary["avg_predicted_happiness"] = summary["avg_predicted_happiness"].round(2)
    summary["rows"] = summary["rows"].astype(int)
    return summary.to_dict(orient="records")


def _build_prediction_correlations(engineered_df: pd.DataFrame, scored_df: pd.DataFrame) -> dict[str, dict[str, float]]:
    numeric = engineered_df.select_dtypes(include="number").copy()
    prediction_columns = [
        "predicted_self_reported_happiness",
        "predicted_perceived_stress_score",
        "predicted_user_engagement_score",
        "predicted_social_media_addiction_risk",
    ]
    for column in prediction_columns:
        numeric[column] = scored_df[column].values

    result: dict[str, dict[str, float]] = {}
    for column in prediction_columns:
        correlations = numeric.corr(numeric_only=True)[column].drop(labels=[column], errors="ignore").dropna()
        result[column] = correlations.abs().sort_values(ascending=False).head(6).round(3).to_dict()
    return result


def _build_prediction_preview(scored_df: pd.DataFrame) -> list[dict[str, Any]]:
    preview_columns = [
        column
        for column in [
            "age",
            "gender",
            "country",
            "daily_active_minutes_instagram",
            "sessions_per_day",
            "followers_count",
            "content_type_preference",
            "predicted_self_reported_happiness",
            "predicted_perceived_stress_score",
            "predicted_user_engagement_score",
            "predicted_social_media_addiction_risk",
            "nearest_persona",
        ]
        if column in scored_df.columns
    ]
    return scored_df[preview_columns].head(50).round(3).to_dict(orient="records")


def _build_export_rows(scored_df: pd.DataFrame) -> list[dict[str, Any]]:
    export_columns = [
        column
        for column in [
            "age",
            "gender",
            "country",
            "daily_active_minutes_instagram",
            "sessions_per_day",
            "posts_created_per_week",
            "followers_count",
            "content_type_preference",
            "predicted_self_reported_happiness",
            "predicted_perceived_stress_score",
            "predicted_user_engagement_score",
            "predicted_social_media_addiction_risk",
            "nearest_persona",
            "cluster_id",
        ]
        if column in scored_df.columns
    ]
    return scored_df[export_columns].round(3).to_dict(orient="records")


def _hash_bytes(content: bytes) -> str:
    return hashlib.sha1(content).hexdigest()


def _read_csv_bytes(content: bytes) -> pd.DataFrame:
    return pd.read_csv(io.BytesIO(content))


def _candidate_targets(df: pd.DataFrame) -> list[dict[str, str]]:
    candidates: list[dict[str, str]] = []
    for column in df.columns:
        series = df[column].dropna()
        if len(series) < 20:
            continue
        unique = series.nunique()
        if pd.api.types.is_numeric_dtype(series):
            task = "classification" if unique <= 12 else "regression"
            candidates.append({"column": column, "task_type": task})
        elif unique <= 20:
            candidates.append({"column": column, "task_type": "classification"})
    return candidates[:15]


def profile_upload(content: bytes) -> dict[str, Any]:
    dataset_id = _hash_bytes(content)
    if dataset_id not in UPLOAD_DATASETS:
        UPLOAD_DATASETS[dataset_id] = _read_csv_bytes(content)

    df = UPLOAD_DATASETS[dataset_id]
    profile = {
        "dataset_id": dataset_id,
        "rows": int(len(df)),
        "columns": int(df.shape[1]),
        "column_names": df.columns.tolist(),
        "dtypes": {column: str(dtype) for column, dtype in df.dtypes.items()},
        "missing": df.isna().sum().sort_values(ascending=False).head(15).to_dict(),
        "preview": df.head(10).fillna("").to_dict(orient="records"),
        "candidate_targets": _candidate_targets(df),
    }
    numeric_cols = df.select_dtypes(include="number").columns.tolist()
    if numeric_cols:
        profile["numeric_summary"] = df[numeric_cols[:12]].describe().round(2).to_dict()
    return profile


def _prepare_matrix(df: pd.DataFrame, target: str, features: list[str] | None) -> tuple[pd.DataFrame, pd.Series, str]:
    chosen_features = features or [column for column in df.columns if column != target]
    frame = df[chosen_features + [target]].dropna().copy()
    y = frame[target]
    X = pd.get_dummies(frame[chosen_features], dummy_na=True)

    if pd.api.types.is_numeric_dtype(y) and y.nunique() > 12:
        task_type = "regression"
    else:
        task_type = "classification"
        y = y.astype(str)

    return X, y, task_type


def train_upload_model(dataset_id: str, target: str, features: list[str] | None, task_type: str, test_size: float) -> dict[str, Any]:
    if dataset_id not in UPLOAD_DATASETS:
        raise KeyError("Dataset not found. Upload and profile the CSV first.")

    df = UPLOAD_DATASETS[dataset_id]
    X, y, inferred_task = _prepare_matrix(df, target, features)
    chosen_task = inferred_task if task_type == "auto" else task_type

    stratify = y if chosen_task == "classification" and y.nunique() > 1 else None
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=test_size,
        random_state=config.RANDOM_STATE,
        stratify=stratify,
    )

    if chosen_task == "regression":
        candidates = {
            "Linear Regression": LinearRegression(),
            "Ridge Regression": Ridge(alpha=1.0),
            "Random Forest Regressor": RandomForestRegressor(n_estimators=100, max_depth=12, random_state=config.RANDOM_STATE, n_jobs=-1),
            "HistGradientBoosting Regressor": HistGradientBoostingRegressor(max_depth=10, learning_rate=0.08, random_state=config.RANDOM_STATE),
        }
    else:
        candidates = {
            "Logistic Regression": LogisticRegression(max_iter=1000),
            "Random Forest Classifier": RandomForestClassifier(n_estimators=100, max_depth=12, random_state=config.RANDOM_STATE, n_jobs=-1),
            "HistGradientBoosting Classifier": HistGradientBoostingClassifier(max_depth=10, learning_rate=0.08, random_state=config.RANDOM_STATE),
        }

    rows: list[dict[str, Any]] = []
    fitted: dict[str, Any] = {}
    for name, model in candidates.items():
        start = perf_counter()
        estimator = clone(model)
        estimator.fit(X_train, y_train)
        predictions = estimator.predict(X_test)
        metric_row: dict[str, Any] = {"algorithm": name, "fit_time_seconds": round(perf_counter() - start, 3)}
        if chosen_task == "regression":
            metric_row.update(
                {
                    "r2": float(r2_score(y_test, predictions)),
                    "rmse": float(mean_squared_error(y_test, predictions) ** 0.5),
                    "mae": float(mean_absolute_error(y_test, predictions)),
                }
            )
        else:
            probabilities = estimator.predict_proba(X_test)[:, 1] if hasattr(estimator, "predict_proba") and len(set(y_test)) == 2 else None
            metric_row.update(
                {
                    "accuracy": float(accuracy_score(y_test, predictions)),
                    "f1": float(f1_score(y_test, predictions, average="weighted")),
                }
            )
            if probabilities is not None:
                metric_row["roc_auc"] = float(roc_auc_score(y_test, probabilities))
        rows.append(metric_row)
        fitted[name] = estimator

    sort_key = "r2" if chosen_task == "regression" else "accuracy"
    best_row = sorted(rows, key=lambda row: row.get(sort_key, float("-inf")), reverse=True)[0]
    artifact_id = hashlib.sha1(f"{dataset_id}:{target}:{best_row['algorithm']}:{chosen_task}".encode()).hexdigest()
    target_corr: dict[str, Any] = {}
    if chosen_task == "regression":
        numeric_cols = df.select_dtypes(include="number").columns.tolist()
        if target in numeric_cols:
            corrs = df[numeric_cols].corr(numeric_only=True)[target].drop(labels=[target], errors="ignore").dropna()
            target_corr = corrs.abs().sort_values(ascending=False).head(8).round(3).to_dict()

    UPLOAD_ARTIFACTS[artifact_id] = UploadArtifact(
        model=fitted[best_row["algorithm"]],
        columns=X.columns.tolist(),
        task_type=chosen_task,
        target=target,
        metrics=rows,
        numeric_summary=target_corr,
    )

    return {
        "artifact_id": artifact_id,
        "task_type": chosen_task,
        "target": target,
        "metrics": rows,
        "best_model": best_row,
        "feature_columns": X.columns.tolist(),
        "train_rows": int(len(X_train)),
        "test_rows": int(len(X_test)),
    }


def predict_uploaded_rows(artifact_id: str, rows: list[dict[str, Any]]) -> dict[str, Any]:
    if artifact_id not in UPLOAD_ARTIFACTS:
        raise KeyError("Artifact not found. Train a model first.")
    artifact = UPLOAD_ARTIFACTS[artifact_id]
    X = pd.get_dummies(pd.DataFrame(rows), dummy_na=True)
    X = X.reindex(columns=artifact.columns, fill_value=0)
    predictions = artifact.model.predict(X)
    result_rows = []
    for input_row, prediction in zip(rows, predictions):
        row = dict(input_row)
        row[f"predicted_{artifact.target}"] = float(prediction) if artifact.task_type == "regression" else str(prediction)
        result_rows.append(row)
    return {"artifact_id": artifact_id, "target": artifact.target, "task_type": artifact.task_type, "rows": result_rows}


def upload_insights(dataset_id: str) -> dict[str, Any]:
    if dataset_id not in UPLOAD_DATASETS:
        raise KeyError("Dataset not found. Upload and profile the CSV first.")
    df = UPLOAD_DATASETS[dataset_id]
    numeric = df.select_dtypes(include="number")
    correlations = {}
    if not numeric.empty:
        corr = numeric.corr(numeric_only=True)
        flattened = []
        for i, col in enumerate(corr.columns):
            for other in corr.columns[i + 1:]:
                flattened.append((f"{col} vs {other}", float(abs(corr.loc[col, other]))))
        correlations = dict(sorted(flattened, key=lambda item: item[1], reverse=True)[:8])

    insights = [
        f"Dataset has {len(df):,} rows and {df.shape[1]} columns.",
        f"Top missing-value column: {df.isna().sum().sort_values(ascending=False).index[0]}.",
        f"Numeric feature count: {numeric.shape[1]}." if not numeric.empty else "No numeric columns detected.",
    ]

    return {"dataset_id": dataset_id, "insights": insights, "top_correlations": correlations}


def predict_instagram_dataset(content: bytes) -> dict[str, Any]:
    df = _read_csv_bytes(content)
    if df.empty:
        raise ValueError("The uploaded CSV is empty.")

    _validate_project_ready_upload(df)

    source_rows = int(len(df))
    was_truncated = source_rows > INSTAGRAM_UPLOAD_ROW_LIMIT
    if was_truncated:
        df = df.head(INSTAGRAM_UPLOAD_ROW_LIMIT).copy()
    else:
        df = df.copy()

    df = df.reset_index(drop=True)
    predictions_df = predict_project_batch(df)
    scored_df = pd.concat([df.reset_index(drop=True), predictions_df.reset_index(drop=True)], axis=1)
    engineered_df = engineer_features(df.copy())
    persona_counts = scored_df["nearest_persona"].value_counts().to_dict()
    rows_scored = int(len(scored_df))
    high_risk_rate = float((scored_df["predicted_social_media_addiction_risk"] >= 0.5).mean() * 100)
    summary = {
        "source_rows": source_rows,
        "rows_scored": rows_scored,
        "was_truncated": was_truncated,
        "avg_predicted_happiness": round(float(scored_df["predicted_self_reported_happiness"].mean()), 2),
        "avg_predicted_stress": round(float(scored_df["predicted_perceived_stress_score"].mean()), 2),
        "avg_predicted_engagement": round(float(scored_df["predicted_user_engagement_score"].mean()), 2),
        "avg_predicted_addiction_risk": round(float(scored_df["predicted_social_media_addiction_risk"].mean()), 3),
        "high_addiction_risk_rate": round(high_risk_rate, 2),
        "dominant_persona": max(persona_counts, key=persona_counts.get),
        "unique_personas": int(scored_df["nearest_persona"].nunique()),
        "unique_countries": int(scored_df["country"].nunique()) if "country" in scored_df.columns else 0,
    }
    insights = [
        f"Scored {rows_scored:,} project-ready Instagram rows with the trained dashboard pipeline.",
        f"Average predicted stress is {summary['avg_predicted_stress']:.2f} (0-40 scale); average predicted happiness is {summary['avg_predicted_happiness']:.2f}/10.",
        f"High addiction-risk probability (>= 0.50) appears in {summary['high_addiction_risk_rate']:.1f}% of scored rows.",
        f"Dominant persona in this batch: {summary['dominant_persona']} ({summary['unique_personas']} personas represented).",
    ]
    if was_truncated:
        insights.append(f"Only the first {INSTAGRAM_UPLOAD_ROW_LIMIT:,} rows were scored to keep the response fast and stable.")

    return {
        "mode": "project-ready-instagram",
        "summary": summary,
        "insights": insights,
        "persona_share": {str(key): int(value) for key, value in persona_counts.items()},
        "stress_distribution": _build_distribution(
            scored_df["predicted_perceived_stress_score"],
            [0, 10, 20, 30, 41],
            ["0-10", "10-20", "20-30", "30-40"],
        ),
        "happiness_distribution": _build_happiness_distribution(scored_df["predicted_self_reported_happiness"]),
        "engagement_distribution": _build_engagement_summary(scored_df),
        "addiction_distribution": _build_addiction_distribution(scored_df["predicted_social_media_addiction_risk"]),
        "usage_stress_summary": _build_usage_stress_summary(scored_df),
        "country_summary": _build_country_summary(scored_df),
        "persona_outcome_matrix": _build_persona_outcome_matrix(scored_df),
        "top_prediction_correlations": _build_prediction_correlations(engineered_df, scored_df),
        "preview_rows": _build_prediction_preview(scored_df),
        "export_rows": _build_export_rows(scored_df),
    }