"""
GPU and Subnet Monitoring Service for Eryza Backend
Provides real-time monitoring of GPU resources, subnet status, and system health
Now integrated with Avalanche blockchain for real data
"""

import os
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import asyncio
import json
import logging
from dataclasses import dataclass, asdict
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

try:
    from app.core.database import SessionLocal
except ImportError:
    SessionLocal = None

try:
    from app.core.avalanche_blockchain import avalanche_blockchain_manager
except ImportError:
    avalanche_blockchain_manager = None

logger = logging.getLogger(__name__)

@dataclass
class GPUMetrics:
    """GPU performance metrics"""
    gpu_id: str
    utilization: float  # 0-100%
    temperature: float  # Celsius
    power_draw: float   # Watts
    memory_used: float  # GB
    memory_total: float # GB
    compute_power: float # TFLOPS
    last_updated: datetime
    is_rented: bool
    current_subnet: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data['last_updated'] = self.last_updated.isoformat()
        return data

@dataclass
class SubnetMetrics:
    """Subnet performance and status metrics"""
    subnet_id: str
    coordinator: str
    gpu_count: int
    total_compute: float    # TFLOPS
    total_memory: float     # GB
    avg_utilization: float  # 0-100%
    avg_temperature: float  # Celsius
    total_power_draw: float # Watts
    active: bool
    created_at: datetime
    purpose: str
    
    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data['created_at'] = self.created_at.isoformat()
        return data

@dataclass
class SystemMetrics:
    """Overall system metrics"""
    total_gpus: int
    rented_gpus: int
    available_gpus: int
    active_subnets: int
    total_compute_power: float  # TFLOPS
    total_memory: float         # GB
    avg_system_utilization: float
    blockchain_connected: bool
    last_updated: datetime
    
    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data['last_updated'] = self.last_updated.isoformat()
        return data

class GPUMonitoringService:
    """Service for monitoring GPU resources and subnets"""
    
    def __init__(self):
        self.gpu_metrics: Dict[str, GPUMetrics] = {}
        self.subnet_metrics: Dict[str, SubnetMetrics] = {}
        self.system_metrics: Optional[SystemMetrics] = None
        self.monitoring_active = False
        self.update_interval = 30  # seconds
        
    async def start_monitoring(self):
        """Start the monitoring service"""
        if self.monitoring_active:
            return
            
        logger.info("Starting GPU monitoring service...")
        
        # Initialize Avalanche blockchain connection
        if avalanche_blockchain_manager:
            try:
                await avalanche_blockchain_manager.initialize(
                    network=os.getenv("AVALANCHE_NETWORK", "testnet"),
                    custom_rpc=os.getenv("AVALANCHE_RPC_URL")
                )
                logger.info("✅ Connected to Avalanche blockchain")
            except Exception as e:
                logger.error(f"Failed to connect to Avalanche: {e}")
                logger.info("Continuing with fallback monitoring...")
        
        self.monitoring_active = True
        
        # Start monitoring tasks
        asyncio.create_task(self._monitor_gpu_metrics())
        asyncio.create_task(self._monitor_subnet_metrics())
        asyncio.create_task(self._monitor_system_metrics())
        asyncio.create_task(self._monitor_blockchain_events())
        
    async def stop_monitoring(self):
        """Stop the monitoring service"""
        self.monitoring_active = False
        logger.info("Stopping GPU monitoring service...")
        
    async def _monitor_gpu_metrics(self):
        """Monitor individual GPU metrics"""
        while self.monitoring_active:
            try:
                await self._update_gpu_metrics()
                await asyncio.sleep(self.update_interval)
            except Exception as e:
                logger.error(f"Error updating GPU metrics: {e}")
                await asyncio.sleep(5)
                
    async def _monitor_subnet_metrics(self):
        """Monitor subnet metrics"""
        while self.monitoring_active:
            try:
                await self._update_subnet_metrics()
                await asyncio.sleep(self.update_interval)
            except Exception as e:
                logger.error(f"Error updating subnet metrics: {e}")
                await asyncio.sleep(5)
                
    async def _monitor_system_metrics(self):
        """Monitor overall system metrics"""
        while self.monitoring_active:
            try:
                await self._update_system_metrics()
                await asyncio.sleep(self.update_interval)
            except Exception as e:
                logger.error(f"Error updating system metrics: {e}")
                await asyncio.sleep(5)
    
    async def _update_gpu_metrics(self):
        """Update GPU performance metrics from Avalanche blockchain"""
        try:
            # Get GPU data from Avalanche blockchain
            if not avalanche_blockchain_manager or not avalanche_blockchain_manager.is_connected():
                logger.warning("Avalanche blockchain not connected, using fallback data")
                await self._update_gpu_metrics_fallback()
                return
                
            # Fetch real GPU data from smart contracts
            gpu_data = await avalanche_blockchain_manager.get_all_gpu_data()
            
            if not gpu_data:
                logger.warning("No GPU data from blockchain, using fallback")
                await self._update_gpu_metrics_fallback()
                return
            
            # Process blockchain GPU data
            for gpu_id, gpu_info in gpu_data.items():
                # Get additional metrics (in production, these would come from GPU monitoring agents)
                additional_metrics = await self._get_gpu_performance_metrics(gpu_id)
                
                gpu_metrics = GPUMetrics(
                    gpu_id=gpu_id,
                    utilization=additional_metrics.get("utilization", 0.0),
                    temperature=additional_metrics.get("temperature", 0.0),
                    power_draw=additional_metrics.get("power_draw", 0.0),
                    memory_used=additional_metrics.get("memory_used", 0.0),
                    memory_total=float(gpu_info.get("memory_size", 0)),
                    compute_power=float(gpu_info.get("compute_power", 0)),
                    is_rented=gpu_info.get("is_rented", False),
                    current_subnet=gpu_info.get("current_subnet"),
                    last_updated=datetime.now()
                )
                self.gpu_metrics[gpu_id] = gpu_metrics
                
            logger.info(f"Updated metrics for {len(gpu_data)} GPUs from Avalanche blockchain")
            
        except Exception as e:
            logger.error(f"Failed to update GPU metrics from blockchain: {e}")
            await self._update_gpu_metrics_fallback()
    
    async def _update_gpu_metrics_fallback(self):
        """Fallback GPU metrics when blockchain is unavailable"""
        # Use simulated data as fallback (keep existing simulation logic)
        simulated_gpus = [
            {
                "gpu_id": "gpu_001",
                "utilization": 85.5,
                "temperature": 72.0,
                "power_draw": 350.0,
                "memory_used": 20.5,
                "memory_total": 24.0,
                "compute_power": 83.0,
                "is_rented": True,
                "current_subnet": "subnet_ml_training_001"
            },
            {
                "gpu_id": "gpu_002", 
                "utilization": 45.2,
                "temperature": 65.0,
                "power_draw": 280.0,
                "memory_used": 12.8,
                "memory_total": 24.0,
                "compute_power": 83.0,
                "is_rented": True,
                "current_subnet": "subnet_inference_001"
            },
            {
                "gpu_id": "gpu_003",
                "utilization": 0.0,
                "temperature": 35.0,
                "power_draw": 50.0,
                "memory_used": 0.0,
                "memory_total": 16.0,
                "compute_power": 65.0,
                "is_rented": False,
                "current_subnet": None
            }
        ]
        
        for gpu_data in simulated_gpus:
            gpu_metrics = GPUMetrics(
                gpu_id=gpu_data["gpu_id"],
                utilization=gpu_data["utilization"],
                temperature=gpu_data["temperature"],
                power_draw=gpu_data["power_draw"],
                memory_used=gpu_data["memory_used"],
                memory_total=gpu_data["memory_total"],
                compute_power=gpu_data["compute_power"],
                is_rented=gpu_data["is_rented"],
                current_subnet=gpu_data["current_subnet"],
                last_updated=datetime.now()
            )
            self.gpu_metrics[gpu_data["gpu_id"]] = gpu_metrics
            
        logger.debug(f"Updated fallback metrics for {len(simulated_gpus)} GPUs")
    
    async def _get_gpu_performance_metrics(self, gpu_id: str) -> Dict[str, float]:
        """Get GPU performance metrics from monitoring agents"""
        # In production, this would query actual GPU monitoring services
        # For now, simulate performance metrics based on blockchain data
        
        try:
            # Simulate different performance levels
            import hashlib
            import random
            
            # Use GPU ID as seed for consistent "performance"
            seed = int(hashlib.md5(gpu_id.encode()).hexdigest()[:8], 16)
            random.seed(seed + int(datetime.now().timestamp()) // 60)  # Change every minute
            
            # Simulate realistic GPU metrics
            base_utilization = random.uniform(30, 95)
            base_temperature = random.uniform(55, 85)
            
            return {
                "utilization": base_utilization,
                "temperature": base_temperature,
                "power_draw": 250 + (base_utilization * 2.5),  # Power scales with utilization
                "memory_used": random.uniform(8, 22)  # Memory usage varies
            }
            
        except Exception as e:
            logger.error(f"Failed to get performance metrics for {gpu_id}: {e}")
            return {
                "utilization": 0.0,
                "temperature": 45.0,
                "power_draw": 50.0,
                "memory_used": 0.0
            }
    
    async def _update_subnet_metrics(self):
        """Update subnet performance metrics from Avalanche blockchain"""
        try:
            # Get subnet data from Avalanche blockchain
            if not avalanche_blockchain_manager or not avalanche_blockchain_manager.is_connected():
                logger.warning("Avalanche blockchain not connected, using fallback subnet data")
                await self._update_subnet_metrics_fallback()
                return
                
            # Fetch real subnet data from smart contracts
            subnet_data = await avalanche_blockchain_manager.get_all_subnet_data()
            
            if not subnet_data:
                logger.warning("No subnet data from blockchain, using fallback")
                await self._update_subnet_metrics_fallback()
                return
            
            # Process blockchain subnet data
            for subnet_id, subnet_info in subnet_data.items():
                # Calculate aggregated metrics from GPUs in this subnet
                gpu_metrics_in_subnet = [
                    gpu for gpu in self.gpu_metrics.values() 
                    if gpu.current_subnet == subnet_id
                ]
                
                if gpu_metrics_in_subnet:
                    avg_utilization = sum(gpu.utilization for gpu in gpu_metrics_in_subnet) / len(gpu_metrics_in_subnet)
                    avg_temperature = sum(gpu.temperature for gpu in gpu_metrics_in_subnet) / len(gpu_metrics_in_subnet)
                    total_power = sum(gpu.power_draw for gpu in gpu_metrics_in_subnet)
                else:
                    avg_utilization = 0.0
                    avg_temperature = 0.0
                    total_power = 0.0
                
                subnet_metrics = SubnetMetrics(
                    subnet_id=subnet_id,
                    coordinator=subnet_info.get("coordinator", "Unknown"),
                    gpu_count=subnet_info.get("gpu_count", 0),
                    total_compute=float(subnet_info.get("total_compute", 0)),
                    total_memory=float(subnet_info.get("total_memory", 0)),
                    avg_utilization=avg_utilization,
                    avg_temperature=avg_temperature,
                    total_power_draw=total_power,
                    active=subnet_info.get("active", False),
                    created_at=datetime.fromtimestamp(subnet_info.get("created_at", 0)),
                    purpose=subnet_info.get("purpose", "Unknown")
                )
                self.subnet_metrics[subnet_id] = subnet_metrics
            
            logger.info(f"Updated metrics for {len(subnet_data)} subnets from Avalanche blockchain")
            
        except Exception as e:
            logger.error(f"Failed to update subnet metrics from blockchain: {e}")
            await self._update_subnet_metrics_fallback()
    
    async def _update_subnet_metrics_fallback(self):
        """Fallback subnet metrics when blockchain is unavailable"""
        # Aggregate GPU metrics by subnet (fallback method)
        subnet_data = {}
        
        for gpu_id, gpu_metrics in self.gpu_metrics.items():
            if gpu_metrics.current_subnet:
                subnet_id = gpu_metrics.current_subnet
                if subnet_id not in subnet_data:
                    subnet_data[subnet_id] = {
                        "gpus": [],
                        "total_compute": 0,
                        "total_memory": 0,
                        "total_utilization": 0,
                        "total_temperature": 0,
                        "total_power": 0
                    }
                
                subnet_info = subnet_data[subnet_id]
                subnet_info["gpus"].append(gpu_metrics)
                subnet_info["total_compute"] += gpu_metrics.compute_power
                subnet_info["total_memory"] += gpu_metrics.memory_total
                subnet_info["total_utilization"] += gpu_metrics.utilization
                subnet_info["total_temperature"] += gpu_metrics.temperature
                subnet_info["total_power"] += gpu_metrics.power_draw
        
        # Create subnet metrics
        for subnet_id, data in subnet_data.items():
            gpu_count = len(data["gpus"])
            if gpu_count > 0:
                subnet_metrics = SubnetMetrics(
                    subnet_id=subnet_id,
                    coordinator="0x1234...5678",  # Fallback coordinator
                    gpu_count=gpu_count,
                    total_compute=data["total_compute"],
                    total_memory=data["total_memory"],
                    avg_utilization=data["total_utilization"] / gpu_count,
                    avg_temperature=data["total_temperature"] / gpu_count,
                    total_power_draw=data["total_power"],
                    active=True,
                    created_at=datetime.now() - timedelta(hours=2),  # Simulated
                    purpose="ML Training" if "training" in subnet_id else "Inference"
                )
                self.subnet_metrics[subnet_id] = subnet_metrics
        
        logger.debug(f"Updated fallback metrics for {len(subnet_data)} subnets")
    
    async def _update_system_metrics(self):
        """Update overall system metrics from Avalanche blockchain"""
        try:
            # Get system stats from Avalanche blockchain
            blockchain_connected = False
            blockchain_stats = {}
            
            if avalanche_blockchain_manager and avalanche_blockchain_manager.is_connected():
                blockchain_connected = True
                blockchain_stats = await avalanche_blockchain_manager.get_system_stats()
            
            # Calculate metrics from current data
            total_gpus = len(self.gpu_metrics)
            rented_gpus = sum(1 for gpu in self.gpu_metrics.values() if gpu.is_rented)
            available_gpus = total_gpus - rented_gpus
            active_subnets = len(self.subnet_metrics)
            
            total_compute = sum(gpu.compute_power for gpu in self.gpu_metrics.values())
            total_memory = sum(gpu.memory_total for gpu in self.gpu_metrics.values())
            
            if total_gpus > 0:
                avg_utilization = sum(gpu.utilization for gpu in self.gpu_metrics.values()) / total_gpus
            else:
                avg_utilization = 0.0
            
            # Use blockchain data if available, otherwise use calculated values
            self.system_metrics = SystemMetrics(
                total_gpus=blockchain_stats.get("total_gpus", total_gpus),
                rented_gpus=blockchain_stats.get("rented_gpus", rented_gpus),
                available_gpus=blockchain_stats.get("available_gpus", available_gpus),
                active_subnets=blockchain_stats.get("active_subnets", active_subnets),
                total_compute_power=blockchain_stats.get("total_compute_power", total_compute),
                total_memory=total_memory,
                avg_system_utilization=avg_utilization,
                blockchain_connected=blockchain_connected,
                last_updated=datetime.now()
            )
            
            logger.debug("Updated system metrics from Avalanche blockchain")
            
        except Exception as e:
            logger.error(f"Failed to update system metrics: {e}")
    
    async def _monitor_blockchain_events(self):
        """Monitor blockchain events for real-time updates"""
        while self.monitoring_active:
            try:
                if avalanche_blockchain_manager and avalanche_blockchain_manager.is_connected():
                    # Get recent blockchain events
                    events = await avalanche_blockchain_manager.get_recent_events()
                    
                    for event in events:
                        await self._process_blockchain_event(event)
                        
                await asyncio.sleep(10)  # Check for events every 10 seconds
                
            except Exception as e:
                logger.error(f"Error monitoring blockchain events: {e}")
                await asyncio.sleep(5)
    
    async def _process_blockchain_event(self, event: Dict[str, Any]):
        """Process individual blockchain events"""
        try:
            event_type = event.get("event")
            event_args = event.get("args", {})
            
            if event_type == "GPURegistered":
                logger.info(f"New GPU registered: {event_args.get('gpuId')}")
                # Trigger immediate GPU metrics update
                await self._update_gpu_metrics()
                
            elif event_type == "GPURented":
                logger.info(f"GPU rented: {event_args.get('gpuId')} by {event_args.get('renter')}")
                # Trigger immediate GPU and system metrics update
                await self._update_gpu_metrics()
                await self._update_system_metrics()
                
            elif event_type == "SubnetCreated":
                logger.info(f"New subnet created: {event_args.get('subnetId')}")
                # Trigger immediate subnet metrics update
                await self._update_subnet_metrics()
                await self._update_system_metrics()
                
            elif event_type == "GPUMetricsUpdated":
                logger.debug(f"GPU metrics updated: {event_args.get('gpuId')}")
                # Update specific GPU metrics
                gpu_id = event_args.get("gpuId")
                if gpu_id:
                    await self._update_specific_gpu_metrics(gpu_id)
            
        except Exception as e:
            logger.error(f"Failed to process blockchain event: {e}")
    
    async def _update_specific_gpu_metrics(self, gpu_id: str):
        """Update metrics for a specific GPU"""
        try:
            if not avalanche_blockchain_manager or not avalanche_blockchain_manager.is_connected():
                return
            
            # Get specific GPU data from blockchain
            all_gpu_data = await avalanche_blockchain_manager.get_all_gpu_data()
            gpu_info = all_gpu_data.get(gpu_id)
            
            if gpu_info:
                additional_metrics = await self._get_gpu_performance_metrics(gpu_id)
                
                gpu_metrics = GPUMetrics(
                    gpu_id=gpu_id,
                    utilization=additional_metrics.get("utilization", 0.0),
                    temperature=additional_metrics.get("temperature", 0.0),
                    power_draw=additional_metrics.get("power_draw", 0.0),
                    memory_used=additional_metrics.get("memory_used", 0.0),
                    memory_total=float(gpu_info.get("memory_size", 0)),
                    compute_power=float(gpu_info.get("compute_power", 0)),
                    is_rented=gpu_info.get("is_rented", False),
                    current_subnet=gpu_info.get("current_subnet"),
                    last_updated=datetime.now()
                )
                self.gpu_metrics[gpu_id] = gpu_metrics
                logger.debug(f"Updated specific metrics for GPU {gpu_id}")
                
        except Exception as e:
            logger.error(f"Failed to update specific GPU metrics for {gpu_id}: {e}")
    
    def get_gpu_metrics(self, gpu_id: Optional[str] = None) -> Dict[str, Any]:
        """Get GPU metrics for specific GPU or all GPUs"""
        if gpu_id:
            gpu_metric = self.gpu_metrics.get(gpu_id)
            return gpu_metric.to_dict() if gpu_metric else {}
        
        return {gpu_id: metrics.to_dict() for gpu_id, metrics in self.gpu_metrics.items()}
    
    def get_subnet_metrics(self, subnet_id: Optional[str] = None) -> Dict[str, Any]:
        """Get subnet metrics for specific subnet or all subnets"""
        if subnet_id:
            subnet_metric = self.subnet_metrics.get(subnet_id)
            return subnet_metric.to_dict() if subnet_metric else {}
        
        return {subnet_id: metrics.to_dict() for subnet_id, metrics in self.subnet_metrics.items()}
    
    def get_system_metrics(self) -> Dict[str, Any]:
        """Get overall system metrics"""
        return self.system_metrics.to_dict() if self.system_metrics else {}
    
    def get_gpu_health_status(self, gpu_id: str) -> Dict[str, Any]:
        """Get health status for a specific GPU"""
        gpu_metric = self.gpu_metrics.get(gpu_id)
        if not gpu_metric:
            return {"status": "unknown", "gpu_id": gpu_id}
        
        # Determine health status based on metrics
        health_status = "healthy"
        warnings = []
        
        if gpu_metric.temperature > 85:
            health_status = "warning"
            warnings.append("High temperature")
        elif gpu_metric.temperature > 90:
            health_status = "critical"
            warnings.append("Critical temperature")
        
        if gpu_metric.utilization == 0 and gpu_metric.is_rented:
            health_status = "warning"
            warnings.append("No utilization despite being rented")
        
        if gpu_metric.power_draw > 400:
            warnings.append("High power consumption")
        
        return {
            "status": health_status,
            "gpu_id": gpu_id,
            "warnings": warnings,
            "metrics": gpu_metric.to_dict()
        }
    
    def get_subnet_health_status(self, subnet_id: str) -> Dict[str, Any]:
        """Get health status for a specific subnet"""
        subnet_metric = self.subnet_metrics.get(subnet_id)
        if not subnet_metric:
            return {"status": "unknown", "subnet_id": subnet_id}
        
        health_status = "healthy"
        warnings = []
        
        if subnet_metric.avg_temperature > 80:
            health_status = "warning"
            warnings.append("High average temperature")
        
        if subnet_metric.avg_utilization < 10:
            warnings.append("Low utilization")
        elif subnet_metric.avg_utilization > 95:
            warnings.append("Very high utilization")
        
        return {
            "status": health_status,
            "subnet_id": subnet_id,
            "warnings": warnings,
            "metrics": subnet_metric.to_dict()
        }
    
    async def simulate_gpu_metrics_update(self, gpu_id: str, metrics: Dict[str, float]):
        """Simulate updating GPU metrics (for testing)"""
        if gpu_id in self.gpu_metrics:
            gpu_metric = self.gpu_metrics[gpu_id]
            gpu_metric.utilization = metrics.get("utilization", gpu_metric.utilization)
            gpu_metric.temperature = metrics.get("temperature", gpu_metric.temperature)
            gpu_metric.power_draw = metrics.get("power_draw", gpu_metric.power_draw)
            gpu_metric.memory_used = metrics.get("memory_used", gpu_metric.memory_used)
            gpu_metric.last_updated = datetime.now()

# Global monitoring service instance
gpu_monitoring_service = GPUMonitoringService()