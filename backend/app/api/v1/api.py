from fastapi import APIRouter
from app.api.v1.endpoints import jobs_display
from app.api.v1 import monitoring

api_router = APIRouter()

# Include endpoint routers
api_router.include_router(jobs_display.router, prefix="/display", tags=["Job Display"])
api_router.include_router(monitoring.router, prefix="/monitoring", tags=["Monitoring"])
