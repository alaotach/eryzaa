from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from contextlib import asynccontextmanager
import uvicorn
import logging
from typing import Optional

from app.core.config import settings
from app.core.database import engine, SessionLocal
from app.models import models
from app.api.v1.api import api_router
from app.core.blockchain import blockchain_manager
from app.core.scheduler import job_scheduler
from app.core.logger import setup_logging

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)

# Create database tables
models.Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    logger.info("Starting Eryza Backend API...")
    
    # Initialize blockchain connection
    await blockchain_manager.initialize()
    
    # Start job scheduler
    await job_scheduler.start()
    
    logger.info("✅ Eryza Backend API started successfully")
    yield
    
    # Cleanup
    logger.info("Shutting down Eryza Backend API...")
    await job_scheduler.stop()
    logger.info("✅ Eryza Backend API shut down complete")

# Create FastAPI app
app = FastAPI(
    title="Eryza Compute Network API",
    description="Backend API for Eryza decentralized compute network",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_HOSTS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Eryza Compute Network API",
        "version": "1.0.0",
        "status": "operational",
        "blockchain_connected": blockchain_manager.is_connected()
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "blockchain": "connected" if blockchain_manager.is_connected() else "disconnected",
        "scheduler": "running" if job_scheduler.is_running() else "stopped"
    }

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )