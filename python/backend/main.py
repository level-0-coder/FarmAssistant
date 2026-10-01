from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from backend.auth.routes import router as auth_router
from backend.profile.routes import router as profile_router
from backend.sensors.routes import router as sensors_router
from backend.farms.routes import router as farms_router

from backend.scheduler import start_scheduler, stop_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()

    yield

    stop_scheduler()


# app = FastAPI(lifespan=lifespan)

app = FastAPI(
    title="FarmAssistant API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(profile_router)
app.include_router(sensors_router)
app.include_router(farms_router)

@app.get("/")
def root():
    return {
        "message": "FarmAssistant API"
    }