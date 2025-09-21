from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from enum import Enum

class JobStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class JobBase(BaseModel):
    client_id: str
    description: Optional[str] = None
    payment_amount: Optional[float] = None

class JobCreate(JobBase):
    requirements: Optional[dict] = None

class JobUpdate(BaseModel):
    status: Optional[JobStatus] = None
    node_id: Optional[str] = None
    ssh_username: Optional[str] = None

class JobResponse(JobBase):
    id: str
    node_id: Optional[str] = None
    status: JobStatus
    ssh_username: Optional[str] = None
    created_at: datetime
    expires_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
