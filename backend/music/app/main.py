import os
import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.routers import search, stream

load_dotenv()

app = FastAPI(
    title="67Songs Music Discovery Service",
    version="1.0.0",
    docs_url="/docs",
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search.router)
app.include_router(stream.router)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "67songs-music-service",
        "provider": "ytmusicapi-unauthenticated",
        "timestamp": int(time.time() * 1000),
    }


@app.get("/")
def root():
    return health_check()
