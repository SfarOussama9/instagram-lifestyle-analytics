from __future__ import annotations

from fastapi import APIRouter

from app.schemas import StatusResponse
from app.services.training import get_status


router = APIRouter(prefix="/api/status", tags=["status"])


@router.get("", response_model=StatusResponse)
def status() -> StatusResponse:
    return StatusResponse(**get_status())
