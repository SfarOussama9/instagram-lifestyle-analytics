from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, Query, UploadFile

from app.schemas import PredictionRequest, PredictionResponse, UploadPredictRequest, UploadTrainRequest
from app.services.training import (
    ModelNotReadyError,
    get_advanced,
    get_clusters,
    get_eda,
    get_feature_importance,
    get_feature_schema,
    get_models,
    get_overview,
    predict,
    retrain_async,
)
from app.services.upload_service import predict_instagram_dataset, predict_uploaded_rows, profile_upload, train_upload_model, upload_insights


router = APIRouter(prefix="/api", tags=["dashboard"])


@router.get("/dataset/overview")
def dataset_overview() -> dict:
    return get_overview()


@router.get("/dataset/eda")
def dataset_eda() -> dict:
    return get_eda()


@router.get("/dataset/feature-schema")
def dataset_feature_schema() -> dict:
    return get_feature_schema()


@router.get("/clusters")
def clusters() -> dict:
    try:
        return get_clusters()
    except ModelNotReadyError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/advanced")
def advanced() -> dict:
    try:
        return get_advanced()
    except ModelNotReadyError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/models/catalog")
def models_catalog() -> dict:
    try:
        return get_models()
    except ModelNotReadyError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/models/feature-importance")
def models_feature_importance(target: str = Query(...)) -> dict:
    try:
        return {"target": target, "rows": get_feature_importance(target)}
    except ModelNotReadyError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/predict", response_model=PredictionResponse)
def predict_targets(request: PredictionRequest) -> PredictionResponse:
    try:
        return PredictionResponse(**predict(request.features))
    except ModelNotReadyError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/admin/retrain")
def retrain_models() -> dict:
    return retrain_async()


@router.post("/upload/profile")
async def upload_profile(file: UploadFile = File(...)) -> dict:
    try:
        content = await file.read()
        return profile_upload(content)
    except Exception as exc:  # pragma: no cover - defensive API boundary
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/upload/train")
def upload_train(request: UploadTrainRequest) -> dict:
    try:
        return train_upload_model(request.dataset_id, request.target, request.features, request.task_type, request.test_size)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - defensive API boundary
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/upload/predict")
def upload_predict(request: UploadPredictRequest) -> dict:
    try:
        return predict_uploaded_rows(request.artifact_id, request.rows)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - defensive API boundary
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/upload/insights")
def upload_insights_route(dataset_id: str = Query(...)) -> dict:
    try:
        return upload_insights(dataset_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/upload/predict-instagram")
async def upload_predict_instagram(file: UploadFile = File(...)) -> dict:
    try:
        content = await file.read()
        return predict_instagram_dataset(content)
    except ModelNotReadyError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - defensive API boundary
        raise HTTPException(status_code=400, detail=str(exc)) from exc
