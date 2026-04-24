from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class StatusResponse(BaseModel):
    ready: bool
    stage: str
    progress: float = Field(ge=0.0, le=1.0)
    message: str


class PredictionRequest(BaseModel):
    features: dict[str, Any]


class PredictionResult(BaseModel):
    target: str
    value: float


class PredictionResponse(BaseModel):
    predictions: list[PredictionResult]
    nearest_persona: str
    cluster_id: int


class UploadTrainRequest(BaseModel):
    dataset_id: str
    target: str
    features: list[str] | None = None
    task_type: str = "auto"
    test_size: float = Field(default=0.2, ge=0.1, le=0.4)


class UploadPredictRequest(BaseModel):
    artifact_id: str
    rows: list[dict[str, Any]]


class FeatureNumericStats(BaseModel):
    min: float
    max: float
    median: float
    p25: float
    p75: float


class FeatureSchemaResponse(BaseModel):
    numeric: dict[str, FeatureNumericStats]
    categorical: dict[str, list[str]]

