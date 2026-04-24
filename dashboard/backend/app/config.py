from __future__ import annotations

import os
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[2]
WORKSPACE_DIR = BASE_DIR.parent


def _resolve_dataset_path() -> Path:
    override = os.getenv("INSTAGRAM_DATASET_PATH")
    if override:
        return Path(override).expanduser().resolve()

    candidates = [
        WORKSPACE_DIR / "instagram_users_lifestyle.csv",
        WORKSPACE_DIR / "instagram_users_lifestyle_sample_10000_engineered.csv",
    ]

    for candidate in candidates:
        if candidate.exists():
            return candidate

    return candidates[0]


DATASET_PATH = _resolve_dataset_path()
ARTIFACTS_DIR = BASE_DIR / "app" / "artifacts"

SAMPLE_FRAC = 0.5
BOOTSTRAP_SAMPLE_FRAC = 0.1
TRAINING_SAMPLE_SIZE = 150_000
RANDOM_STATE = 42
TEST_SIZE = 0.2
PCA_SAMPLE_SIZE = 10_000
IMPORTANCE_SAMPLE_SIZE = 4_000
CORRELATION_TOP_N = 15
CLUSTER_SELECTION_SAMPLE_SIZE = 20_000
N_CLUSTERS = 6
TRAINING_STATE_PATH = ARTIFACTS_DIR / "training_state.joblib"

FRONTEND_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
