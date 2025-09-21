from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.models import Job, ComputeNode
from app.schemas.jobs import JobResponse, JobStatus
from app.schemas.nodes import NodeResponse, NodeStatus
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

class ActiveJobResponse(BaseModel):
    job_id: str
    client_id: str
    node_id: str
    node_ip: str
    ssh_username: Optional[str] = None
    ssh_info: Optional[str] = None
    status: str
    created_at: datetime
    expires_at: Optional[datetime] = None
    payment_amount: Optional[float] = None

class RentalNodeResponse(BaseModel):
    node_id: str
    ip_address: str
    zerotier_ip: Optional[str] = None
    status: str
    current_job: Optional[str] = None
    ssh_user: Optional[str] = None
    capabilities: dict
    pricing: dict
    last_seen: datetime

@router.get("/active-jobs", response_model=List[ActiveJobResponse])
async def get_active_jobs(db: Session = Depends(get_db)):
    """Get all currently active jobs with rental node information"""
    
    try:
        # Query active jobs with node information
        jobs = db.query(Job).filter(
            Job.status.in_([JobStatus.RUNNING, JobStatus.ACCEPTED])
        ).all()
        
        active_jobs = []
        for job in jobs:
            # Get node information
            node = db.query(ComputeNode).filter(
                ComputeNode.id == job.node_id
            ).first()
            
            job_response = ActiveJobResponse(
                job_id=str(job.id),
                client_id=str(job.client_id),
                node_id=str(job.node_id) if job.node_id else "Unknown",
                node_ip=node.ip_address if node else "Unknown",
                ssh_username=job.ssh_username if hasattr(job, 'ssh_username') else None,
                ssh_info=f"ssh {job.ssh_username}@{node.ip_address}" if (hasattr(job, 'ssh_username') and job.ssh_username and node) else None,
                status=job.status.value,
                created_at=job.created_at,
                expires_at=job.expires_at if hasattr(job, 'expires_at') else None,
                payment_amount=float(job.payment_amount) if job.payment_amount else None
            )
            active_jobs.append(job_response)
        
        return active_jobs
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve active jobs: {str(e)}")

@router.get("/rental-nodes", response_model=List[RentalNodeResponse])
async def get_rental_nodes(db: Session = Depends(get_db)):
    """Get all available rental nodes with their current status"""
    
    try:
        nodes = db.query(ComputeNode).filter(
            ComputeNode.status.in_([NodeStatus.ACTIVE, NodeStatus.BUSY])
        ).all()
        
        rental_nodes = []
        for node in nodes:
            # Check for current job
            current_job = db.query(Job).filter(
                Job.node_id == node.id,
                Job.status.in_([JobStatus.RUNNING, JobStatus.ACCEPTED])
            ).first()
            
            node_response = RentalNodeResponse(
                node_id=str(node.id),
                ip_address=node.ip_address,
                zerotier_ip=node.zerotier_ip if hasattr(node, 'zerotier_ip') else None,
                status=node.status.value,
                current_job=str(current_job.id) if current_job else None,
                ssh_user=current_job.ssh_username if (current_job and hasattr(current_job, 'ssh_username')) else None,
                capabilities=node.capabilities if node.capabilities else {},
                pricing=node.pricing if node.pricing else {},
                last_seen=node.last_seen
            )
            rental_nodes.append(node_response)
        
        return rental_nodes
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve rental nodes: {str(e)}")

@router.get("/job-stats")
async def get_job_statistics(db: Session = Depends(get_db)):
    """Get overall job and rental statistics"""
    
    try:
        total_jobs = db.query(Job).count()
        active_jobs = db.query(Job).filter(
            Job.status.in_([JobStatus.RUNNING, JobStatus.ACCEPTED])
        ).count()
        
        total_nodes = db.query(ComputeNode).count()
        active_nodes = db.query(ComputeNode).filter(
            ComputeNode.status == NodeStatus.ACTIVE
        ).count()
        busy_nodes = db.query(ComputeNode).filter(
            ComputeNode.status == NodeStatus.BUSY
        ).count()
        
        return {
            "jobs": {
                "total": total_jobs,
                "active": active_jobs,
                "completed": total_jobs - active_jobs
            },
            "nodes": {
                "total": total_nodes,
                "available": active_nodes,
                "busy": busy_nodes,
                "utilization": round((busy_nodes / total_nodes * 100) if total_nodes > 0 else 0, 2)
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve statistics: {str(e)}")

@router.post("/jobs/{job_id}/ssh-access")
async def create_ssh_access(job_id: str, db: Session = Depends(get_db)):
    """Create SSH access for a job (called when payment is confirmed)"""
    
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        if job.status != JobStatus.ACCEPTED:
            raise HTTPException(status_code=400, detail="Job must be accepted before creating SSH access")
        
        # Get node information
        node = db.query(ComputeNode).filter(ComputeNode.id == job.node_id).first()
        if not node:
            raise HTTPException(status_code=404, detail="Node not found")
        
        # Generate SSH username (this would integrate with the SSH manager)
        import uuid
        ssh_username = f"job_{str(uuid.uuid4()).replace('-', '')[:8]}"
        
        # Update job with SSH information
        job.ssh_username = ssh_username
        job.status = JobStatus.RUNNING
        db.commit()
        
        return {
            "job_id": str(job.id),
            "ssh_username": ssh_username,
            "ssh_command": f"ssh {ssh_username}@{node.ip_address}",
            "node_ip": node.ip_address,
            "message": "SSH access created successfully"
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create SSH access: {str(e)}")

@router.delete("/jobs/{job_id}/ssh-access")
async def remove_ssh_access(job_id: str, db: Session = Depends(get_db)):
    """Remove SSH access for a job (called when job ends)"""
    
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Remove SSH username and update status
        ssh_username = job.ssh_username if hasattr(job, 'ssh_username') else None
        job.ssh_username = None
        job.status = JobStatus.COMPLETED
        db.commit()
        
        return {
            "job_id": str(job.id),
            "removed_ssh_user": ssh_username,
            "message": "SSH access removed successfully"
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to remove SSH access: {str(e)}")
