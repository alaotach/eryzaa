from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any
from enum import Enum

class NodeStatus(str, Enum):
    ACTIVE = "active"
    BUSY = "busy"
    OFFLINE = "offline"
    MAINTENANCE = "maintenance"

class NodeBase(BaseModel):
    ip_address: str
    zerotier_ip: Optional[str] = None
    capabilities: Optional[Dict[str, Any]] = None
    pricing: Optional[Dict[str, Any]] = None

class NodeCreate(NodeBase):
    pass

class NodeUpdate(BaseModel):
    status: Optional[NodeStatus] = None
    zerotier_ip: Optional[str] = None
    capabilities: Optional[Dict[str, Any]] = None
    pricing: Optional[Dict[str, Any]] = None

class NodeResponse(NodeBase):
    id: str
    status: NodeStatus
    last_seen: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True
