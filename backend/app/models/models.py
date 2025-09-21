from sqlalchemy import Column, Integer, String, DateTime, Float, Text, Boolean, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum
import enum

Base = declarative_base()

class JobStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class NodeStatus(str, enum.Enum):
    ACTIVE = "active"
    BUSY = "busy"
    OFFLINE = "offline"
    MAINTENANCE = "maintenance"

class Job(Base):
    __tablename__ = "jobs"
    
    id = Column(String, primary_key=True, index=True)
    client_id = Column(String, index=True)
    node_id = Column(String, ForeignKey("compute_nodes.id"), nullable=True)
    status = Column(String, default=JobStatus.PENDING)
    payment_amount = Column(Float)
    ssh_username = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)
    description = Column(Text, nullable=True)
    requirements = Column(JSON, nullable=True)
    
    # Relationship to node
    node = relationship("ComputeNode", back_populates="jobs")

class ComputeNode(Base):
    __tablename__ = "compute_nodes"
    
    id = Column(String, primary_key=True, index=True)
    ip_address = Column(String, index=True)
    zerotier_ip = Column(String, nullable=True)
    status = Column(String, default=NodeStatus.ACTIVE)
    capabilities = Column(JSON, nullable=True)
    pricing = Column(JSON, nullable=True)
    last_seen = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship to jobs
    jobs = relationship("Job", back_populates="node")

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, index=True)
    wallet_address = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
