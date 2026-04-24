from __future__ import annotations

from contextlib import asynccontextmanager
from threading import Thread

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import FRONTEND_ORIGINS
from app.routers.dashboard import router as dashboard_router
from app.routers.status import router as status_router
from app.services.training import ensure_trained


def _start_training_in_background() -> None:
    thread = Thread(target=ensure_trained, daemon=True)
    thread.start()


@asynccontextmanager
async def lifespan(app: FastAPI):
    _start_training_in_background()
    yield


app = FastAPI(title="Instagram Lifestyle Dashboard API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(status_router)
app.include_router(dashboard_router)


@app.get("/")
def root() -> dict[str, str]:
    return {"name": "Instagram Lifestyle Dashboard API", "status": "ok"}