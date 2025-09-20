"""
WebSocket API endpoints for real-time GPU and subnet monitoring
Provides live updates of system metrics, GPU status, and subnet information
Now integrated with Avalanche blockchain for real data
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from fastapi.responses import JSONResponse
from typing import Dict, List, Optional, Any
import asyncio
import json
import logging
from datetime import datetime

# Import the real monitoring service
try:
    from app.services.monitoring import gpu_monitoring_service
    REAL_MONITORING_AVAILABLE = True
except ImportError:
    REAL_MONITORING_AVAILABLE = False
    gpu_monitoring_service = None

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/monitoring", tags=["monitoring"])

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.gpu_subscribers: Dict[str, List[WebSocket]] = {}
        self.subnet_subscribers: Dict[str, List[WebSocket]] = {}
        self.system_subscribers: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        
        # Remove from specific subscriptions
        for gpu_id in list(self.gpu_subscribers.keys()):
            if websocket in self.gpu_subscribers[gpu_id]:
                self.gpu_subscribers[gpu_id].remove(websocket)
                if not self.gpu_subscribers[gpu_id]:
                    del self.gpu_subscribers[gpu_id]
        
        for subnet_id in list(self.subnet_subscribers.keys()):
            if websocket in self.subnet_subscribers[subnet_id]:
                self.subnet_subscribers[subnet_id].remove(websocket)
                if not self.subnet_subscribers[subnet_id]:
                    del self.subnet_subscribers[subnet_id]
        
        if websocket in self.system_subscribers:
            self.system_subscribers.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        try:
            await websocket.send_text(message)
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")
            self.disconnect(websocket)

    async def broadcast_to_gpu_subscribers(self, gpu_id: str, message: str):
        if gpu_id in self.gpu_subscribers:
            disconnected = []
            for websocket in self.gpu_subscribers[gpu_id]:
                try:
                    await websocket.send_text(message)
                except Exception as e:
                    logger.error(f"Error broadcasting to GPU subscriber: {e}")
                    disconnected.append(websocket)
            
            # Remove disconnected websockets
            for ws in disconnected:
                self.disconnect(ws)

    async def broadcast_to_subnet_subscribers(self, subnet_id: str, message: str):
        if subnet_id in self.subnet_subscribers:
            disconnected = []
            for websocket in self.subnet_subscribers[subnet_id]:
                try:
                    await websocket.send_text(message)
                except Exception as e:
                    logger.error(f"Error broadcasting to subnet subscriber: {e}")
                    disconnected.append(websocket)
            
            # Remove disconnected websockets
            for ws in disconnected:
                self.disconnect(ws)

    async def broadcast_to_system_subscribers(self, message: str):
        disconnected = []
        for websocket in self.system_subscribers:
            try:
                await websocket.send_text(message)
            except Exception as e:
                logger.error(f"Error broadcasting to system subscriber: {e}")
                disconnected.append(websocket)
        
        # Remove disconnected websockets
        for ws in disconnected:
            self.disconnect(ws)

    def subscribe_to_gpu(self, websocket: WebSocket, gpu_id: str):
        if gpu_id not in self.gpu_subscribers:
            self.gpu_subscribers[gpu_id] = []
        if websocket not in self.gpu_subscribers[gpu_id]:
            self.gpu_subscribers[gpu_id].append(websocket)

    def subscribe_to_subnet(self, websocket: WebSocket, subnet_id: str):
        if subnet_id not in self.subnet_subscribers:
            self.subnet_subscribers[subnet_id] = []
        if websocket not in self.subnet_subscribers[subnet_id]:
            self.subnet_subscribers[subnet_id].append(websocket)

    def subscribe_to_system(self, websocket: WebSocket):
        if websocket not in self.system_subscribers:
            self.system_subscribers.append(websocket)

manager = ConnectionManager()

# Mock monitoring service for demonstration
class MockMonitoringService:
    def __init__(self):
        self.mock_data = {
            "gpu_001": {
                "gpu_id": "gpu_001",
                "utilization": 85.5,
                "temperature": 72.0,
                "power_draw": 350.0,
                "memory_used": 20.5,
                "memory_total": 24.0,
                "compute_power": 83.0,
                "is_rented": True,
                "current_subnet": "subnet_ml_training_001",
                "last_updated": datetime.now().isoformat()
            }
        }
    
    def get_gpu_metrics(self, gpu_id: Optional[str] = None):
        if gpu_id:
            return self.mock_data.get(gpu_id, {})
        return self.mock_data
    
    def get_subnet_metrics(self, subnet_id: Optional[str] = None):
        return {
            "subnet_ml_training_001": {
                "subnet_id": "subnet_ml_training_001",
                "coordinator": "0x1234...5678",
                "gpu_count": 2,
                "total_compute": 166.0,
                "total_memory": 48.0,
                "avg_utilization": 85.5,
                "avg_temperature": 72.0,
                "total_power_draw": 700.0,
                "active": True,
                "created_at": datetime.now().isoformat(),
                "purpose": "ML Training"
            }
        }
    
    def get_system_metrics(self):
        return {
            "total_gpus": 3,
            "rented_gpus": 2,
            "available_gpus": 1,
            "active_subnets": 2,
            "total_compute_power": 231.0,
            "total_memory": 64.0,
            "avg_system_utilization": 45.2,
            "blockchain_connected": True,
            "last_updated": datetime.now().isoformat()
        }

# Mock monitoring service for demonstration
class MockMonitoringService:
    def __init__(self):
        self.mock_data = {
            "gpu_001": {
                "gpu_id": "gpu_001",
                "utilization": 85.5,
                "temperature": 72.0,
                "power_draw": 350.0,
                "memory_used": 20.5,
                "memory_total": 24.0,
                "compute_power": 83.0,
                "is_rented": True,
                "current_subnet": "subnet_ml_training_001",
                "last_updated": datetime.now().isoformat()
            }
        }
    
    def get_gpu_metrics(self, gpu_id: Optional[str] = None):
        if gpu_id:
            return self.mock_data.get(gpu_id, {})
        return self.mock_data
    
    def get_subnet_metrics(self, subnet_id: Optional[str] = None):
        return {
            "subnet_ml_training_001": {
                "subnet_id": "subnet_ml_training_001",
                "coordinator": "0x1234...5678",
                "gpu_count": 2,
                "total_compute": 166.0,
                "total_memory": 48.0,
                "avg_utilization": 85.5,
                "avg_temperature": 72.0,
                "total_power_draw": 700.0,
                "active": True,
                "created_at": datetime.now().isoformat(),
                "purpose": "ML Training"
            }
        }
    
    def get_system_metrics(self):
        return {
            "total_gpus": 3,
            "rented_gpus": 2,
            "available_gpus": 1,
            "active_subnets": 2,
            "total_compute_power": 231.0,
            "total_memory": 64.0,
            "avg_system_utilization": 45.2,
            "blockchain_connected": True,
            "last_updated": datetime.now().isoformat()
        }

# Use real monitoring service if available, otherwise fallback to mock
if REAL_MONITORING_AVAILABLE and gpu_monitoring_service:
    monitoring_service = gpu_monitoring_service
else:
    # Fallback to mock service for testing
    monitoring_service = MockMonitoringService()

# ===== WebSocket Endpoints =====

@router.websocket("/ws/system")
async def websocket_system_metrics(websocket: WebSocket):
    """WebSocket endpoint for real-time system metrics from Avalanche blockchain"""
    await manager.connect(websocket)
    manager.subscribe_to_system(websocket)
    
    try:
        # Send initial data
        system_metrics = monitoring_service.get_system_metrics()
        await manager.send_personal_message(
            json.dumps({
                "type": "system_metrics",
                "data": system_metrics,
                "source": "avalanche_blockchain" if REAL_MONITORING_AVAILABLE else "mock",
                "timestamp": datetime.now().isoformat()
            }),
            websocket
        )
        
        # Keep connection alive and send periodic updates
        while True:
            await asyncio.sleep(10)  # Update every 10 seconds
            system_metrics = monitoring_service.get_system_metrics()
            await manager.send_personal_message(
                json.dumps({
                    "type": "system_metrics",
                    "data": system_metrics,
                    "source": "avalanche_blockchain" if REAL_MONITORING_AVAILABLE else "mock",
                    "timestamp": datetime.now().isoformat()
                }),
                websocket
            )
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket system metrics error: {e}")
        manager.disconnect(websocket)

@router.websocket("/ws/gpu/{gpu_id}")
async def websocket_gpu_metrics(websocket: WebSocket, gpu_id: str):
    """WebSocket endpoint for real-time GPU metrics from Avalanche blockchain"""
    await manager.connect(websocket)
    manager.subscribe_to_gpu(websocket, gpu_id)
    
    try:
        # Send initial data
        gpu_metrics = monitoring_service.get_gpu_metrics(gpu_id)
        if gpu_metrics:
            await manager.send_personal_message(
                json.dumps({
                    "type": "gpu_metrics",
                    "gpu_id": gpu_id,
                    "data": gpu_metrics,
                    "source": "avalanche_blockchain" if REAL_MONITORING_AVAILABLE else "mock",
                    "timestamp": datetime.now().isoformat()
                }),
                websocket
            )
        
        # Keep connection alive and send periodic updates
        while True:
            await asyncio.sleep(5)  # Update every 5 seconds
            gpu_metrics = monitoring_service.get_gpu_metrics(gpu_id)
            if gpu_metrics:
                await manager.send_personal_message(
                    json.dumps({
                        "type": "gpu_metrics",
                        "gpu_id": gpu_id,
                        "data": gpu_metrics,
                        "source": "avalanche_blockchain" if REAL_MONITORING_AVAILABLE else "mock",
                        "timestamp": datetime.now().isoformat()
                    }),
                    websocket
                )
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket GPU metrics error: {e}")
        manager.disconnect(websocket)

@router.websocket("/ws/subnet/{subnet_id}")
async def websocket_subnet_metrics(websocket: WebSocket, subnet_id: str):
    """WebSocket endpoint for real-time subnet metrics from Avalanche blockchain"""
    await manager.connect(websocket)
    manager.subscribe_to_subnet(websocket, subnet_id)
    
    try:
        # Send initial data
        subnet_metrics = monitoring_service.get_subnet_metrics(subnet_id)
        if subnet_metrics:
            await manager.send_personal_message(
                json.dumps({
                    "type": "subnet_metrics",
                    "subnet_id": subnet_id,
                    "data": subnet_metrics.get(subnet_id, {}) if isinstance(subnet_metrics, dict) else subnet_metrics,
                    "source": "avalanche_blockchain" if REAL_MONITORING_AVAILABLE else "mock",
                    "timestamp": datetime.now().isoformat()
                }),
                websocket
            )
        
        # Keep connection alive and send periodic updates
        while True:
            await asyncio.sleep(10)  # Update every 10 seconds
            subnet_metrics = monitoring_service.get_subnet_metrics(subnet_id)
            if subnet_metrics:
                await manager.send_personal_message(
                    json.dumps({
                        "type": "subnet_metrics",
                        "subnet_id": subnet_id,
                        "data": subnet_metrics.get(subnet_id, {}) if isinstance(subnet_metrics, dict) else subnet_metrics,
                        "source": "avalanche_blockchain" if REAL_MONITORING_AVAILABLE else "mock",
                        "timestamp": datetime.now().isoformat()
                    }),
                    websocket
                )
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket subnet metrics error: {e}")
        manager.disconnect(websocket)

# ===== REST API Endpoints =====

@router.get("/system")
async def get_system_metrics():
    """Get current system metrics from Avalanche blockchain"""
    try:
        metrics = monitoring_service.get_system_metrics()
        return {"success": True, "data": metrics, "source": "avalanche_blockchain" if REAL_MONITORING_AVAILABLE else "mock"}
    except Exception as e:
        logger.error(f"Error getting system metrics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get system metrics")

@router.get("/gpus")
async def get_all_gpu_metrics():
    """Get metrics for all GPUs from Avalanche blockchain"""
    try:
        metrics = monitoring_service.get_gpu_metrics()
        return {"success": True, "data": metrics, "source": "avalanche_blockchain" if REAL_MONITORING_AVAILABLE else "mock"}
    except Exception as e:
        logger.error(f"Error getting GPU metrics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get GPU metrics")

@router.get("/gpu/{gpu_id}")
async def get_gpu_metrics(gpu_id: str):
    """Get metrics for a specific GPU from Avalanche blockchain"""
    try:
        metrics = monitoring_service.get_gpu_metrics(gpu_id)
        if not metrics:
            raise HTTPException(status_code=404, detail="GPU not found")
        return {"success": True, "data": metrics, "source": "avalanche_blockchain" if REAL_MONITORING_AVAILABLE else "mock"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting GPU metrics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get GPU metrics")

@router.get("/subnets")
async def get_all_subnet_metrics():
    """Get metrics for all subnets from Avalanche blockchain"""
    try:
        metrics = monitoring_service.get_subnet_metrics()
        return {"success": True, "data": metrics, "source": "avalanche_blockchain" if REAL_MONITORING_AVAILABLE else "mock"}
    except Exception as e:
        logger.error(f"Error getting subnet metrics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get subnet metrics")

@router.get("/subnet/{subnet_id}")
async def get_subnet_metrics(subnet_id: str):
    """Get metrics for a specific subnet from Avalanche blockchain"""
    try:
        metrics = monitoring_service.get_subnet_metrics(subnet_id)
        subnet_data = metrics.get(subnet_id) if isinstance(metrics, dict) else metrics
        if not subnet_data:
            raise HTTPException(status_code=404, detail="Subnet not found")
        return {"success": True, "data": subnet_data, "source": "avalanche_blockchain" if REAL_MONITORING_AVAILABLE else "mock"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting subnet metrics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get subnet metrics")

@router.get("/health")
async def get_system_health():
    """Get overall system health status from Avalanche blockchain"""
    try:
        system_metrics = monitoring_service.get_system_metrics()
        gpu_metrics = monitoring_service.get_gpu_metrics()
        
        # Calculate health indicators
        total_gpus = system_metrics.get("total_gpus", 0)
        healthy_gpus = 0
        warning_gpus = 0
        critical_gpus = 0
        
        for gpu_id, gpu_data in gpu_metrics.items():
            temp = gpu_data.get("temperature", 0)
            if temp > 90:
                critical_gpus += 1
            elif temp > 85:
                warning_gpus += 1
            else:
                healthy_gpus += 1
        
        # Determine overall health
        if critical_gpus > 0:
            overall_health = "critical"
        elif warning_gpus > total_gpus * 0.3:  # More than 30% warning
            overall_health = "warning"
        else:
            overall_health = "healthy"
        
        health_data = {
            "overall_health": overall_health,
            "blockchain_connected": system_metrics.get("blockchain_connected", False),
            "gpu_health": {
                "healthy": healthy_gpus,
                "warning": warning_gpus,
                "critical": critical_gpus,
                "total": total_gpus
            },
            "system_utilization": system_metrics.get("avg_system_utilization", 0),
            "active_subnets": system_metrics.get("active_subnets", 0),
            "last_updated": datetime.now().isoformat()
        }
        
        return {"success": True, "data": health_data}
        
    except Exception as e:
        logger.error(f"Error getting system health: {e}")
        raise HTTPException(status_code=500, detail="Failed to get system health")

# ===== Administrative Endpoints =====

@router.post("/broadcast/system")
async def broadcast_system_update():
    """Manually trigger system metrics broadcast"""
    try:
        system_metrics = mock_monitoring_service.get_system_metrics()
        message = json.dumps({
            "type": "system_metrics",
            "data": system_metrics,
            "timestamp": datetime.now().isoformat()
        })
        await manager.broadcast_to_system_subscribers(message)
        return {"success": True, "message": "System update broadcasted"}
    except Exception as e:
        logger.error(f"Error broadcasting system update: {e}")
        raise HTTPException(status_code=500, detail="Failed to broadcast update")

@router.get("/connections")
async def get_connection_stats():
    """Get WebSocket connection statistics"""
    try:
        stats = {
            "total_connections": len(manager.active_connections),
            "system_subscribers": len(manager.system_subscribers),
            "gpu_subscribers": {gpu_id: len(subs) for gpu_id, subs in manager.gpu_subscribers.items()},
            "subnet_subscribers": {subnet_id: len(subs) for subnet_id, subs in manager.subnet_subscribers.items()},
            "timestamp": datetime.now().isoformat()
        }
        return {"success": True, "data": stats}
    except Exception as e:
        logger.error(f"Error getting connection stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get connection stats")