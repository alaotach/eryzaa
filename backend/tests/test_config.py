"""
Test configuration and utilities for GPU subnet and monitoring tests
"""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock
from typing import Dict, Any, List

# Test configuration
TEST_CONFIG = {
    "blockchain": {
        "test_network_url": "http://localhost:8545",
        "test_contract_address": "0x1234567890123456789012345678901234567890",
        "test_private_key": "0x" + "1" * 64  # Test private key
    },
    "monitoring": {
        "update_interval": 1,  # Fast updates for testing
        "websocket_timeout": 5
    },
    "gpu": {
        "test_gpus": [
            {
                "gpu_id": "gpu_test_001",
                "compute_power": 83,
                "memory_size": 24,
                "gpu_model": "RTX 4090 (Test)"
            },
            {
                "gpu_id": "gpu_test_002", 
                "compute_power": 65,
                "memory_size": 16,
                "gpu_model": "RTX 3080 (Test)"
            }
        ]
    }
}

class MockBlockchainManager:
    """Mock blockchain manager for testing"""
    
    def __init__(self):
        self.connected = True
        self.contracts = {}
        self.events = []
    
    def is_connected(self) -> bool:
        return self.connected
    
    def set_connected(self, status: bool):
        self.connected = status
    
    def add_event(self, event_data: Dict[str, Any]):
        self.events.append(event_data)
    
    def get_recent_events(self) -> List[Dict[str, Any]]:
        return self.events.copy()

class MockGPUMonitoringService:
    """Mock GPU monitoring service for testing"""
    
    def __init__(self):
        self.gpu_metrics = {}
        self.subnet_metrics = {}
        self.system_metrics = None
        self.monitoring_active = False
    
    async def start_monitoring(self):
        self.monitoring_active = True
    
    async def stop_monitoring(self):
        self.monitoring_active = False
    
    def add_gpu_metrics(self, gpu_id: str, metrics: Dict[str, Any]):
        self.gpu_metrics[gpu_id] = {
            "gpu_id": gpu_id,
            "last_updated": "2025-09-20T12:00:00",
            **metrics
        }
    
    def add_subnet_metrics(self, subnet_id: str, metrics: Dict[str, Any]):
        self.subnet_metrics[subnet_id] = {
            "subnet_id": subnet_id,
            "created_at": "2025-09-20T10:00:00",
            **metrics
        }
    
    def set_system_metrics(self, metrics: Dict[str, Any]):
        self.system_metrics = {
            "last_updated": "2025-09-20T12:00:00",
            **metrics
        }
    
    def get_gpu_metrics(self, gpu_id: str = None):
        if gpu_id:
            return self.gpu_metrics.get(gpu_id, {})
        return self.gpu_metrics
    
    def get_subnet_metrics(self, subnet_id: str = None):
        if subnet_id:
            return self.subnet_metrics.get(subnet_id, {})
        return self.subnet_metrics
    
    def get_system_metrics(self):
        return self.system_metrics or {}

# Test fixtures
@pytest.fixture
def mock_blockchain_manager():
    """Fixture for mock blockchain manager"""
    return MockBlockchainManager()

@pytest.fixture
def mock_monitoring_service():
    """Fixture for mock monitoring service"""
    service = MockGPUMonitoringService()
    
    # Add some test data
    service.add_gpu_metrics("gpu_test_001", {
        "utilization": 85.5,
        "temperature": 72.0,
        "power_draw": 350.0,
        "memory_used": 20.5,
        "memory_total": 24.0,
        "compute_power": 83.0,
        "is_rented": True,
        "current_subnet": "subnet_test_001"
    })
    
    service.add_subnet_metrics("subnet_test_001", {
        "coordinator": "0x1234567890123456789012345678901234567890",
        "gpu_count": 2,
        "total_compute": 148.0,
        "total_memory": 40.0,
        "avg_utilization": 80.0,
        "avg_temperature": 70.0,
        "total_power_draw": 650.0,
        "active": True,
        "purpose": "ML Training Test"
    })
    
    service.set_system_metrics({
        "total_gpus": 2,
        "rented_gpus": 1,
        "available_gpus": 1,
        "active_subnets": 1,
        "total_compute_power": 148.0,
        "total_memory": 40.0,
        "avg_system_utilization": 42.5,
        "blockchain_connected": True
    })
    
    return service

@pytest.fixture
def mock_websocket():
    """Fixture for mock WebSocket"""
    websocket = AsyncMock()
    websocket.accept = AsyncMock()
    websocket.send_text = AsyncMock()
    websocket.close = AsyncMock()
    return websocket

# Test utilities
def create_test_gpu_data(gpu_id: str = "gpu_test_001") -> Dict[str, Any]:
    """Create test GPU data"""
    return {
        "gpu_id": gpu_id,
        "compute_power": 83,
        "memory_size": 24,
        "gpu_model": "RTX 4090 (Test)",
        "utilization": 75.0,
        "temperature": 68.0,
        "power_draw": 320.0,
        "memory_used": 18.0,
        "is_rented": False
    }

def create_test_subnet_data(subnet_id: str = "subnet_test_001") -> Dict[str, Any]:
    """Create test subnet data"""
    return {
        "subnet_id": subnet_id,
        "coordinator": "0x1234567890123456789012345678901234567890",
        "gpu_ids": ["gpu_test_001", "gpu_test_002"],
        "purpose": "ML Training Test",
        "total_compute": 148.0,
        "total_memory": 40.0,
        "active": True
    }

def create_test_transaction_receipt() -> Dict[str, Any]:
    """Create mock transaction receipt"""
    return {
        "transactionHash": "0x" + "a" * 64,
        "blockNumber": 12345,
        "gasUsed": 200000,
        "status": 1,
        "logs": []
    }

class TestDataGenerator:
    """Utility class for generating test data"""
    
    @staticmethod
    def generate_gpu_metrics(count: int = 3) -> Dict[str, Dict[str, Any]]:
        """Generate multiple GPU metrics for testing"""
        metrics = {}
        for i in range(count):
            gpu_id = f"gpu_test_{i+1:03d}"
            metrics[gpu_id] = create_test_gpu_data(gpu_id)
            # Vary the metrics slightly
            metrics[gpu_id]["utilization"] = 50.0 + (i * 15.0)
            metrics[gpu_id]["temperature"] = 65.0 + (i * 5.0)
            metrics[gpu_id]["is_rented"] = i % 2 == 0
        return metrics
    
    @staticmethod
    def generate_subnet_metrics(count: int = 2) -> Dict[str, Dict[str, Any]]:
        """Generate multiple subnet metrics for testing"""
        metrics = {}
        purposes = ["ML Training", "Inference", "Rendering", "Mining"]
        
        for i in range(count):
            subnet_id = f"subnet_test_{i+1:03d}"
            metrics[subnet_id] = create_test_subnet_data(subnet_id)
            metrics[subnet_id]["purpose"] = purposes[i % len(purposes)]
            metrics[subnet_id]["gpu_count"] = 2 + i
            metrics[subnet_id]["total_compute"] = 83.0 * (2 + i)
        
        return metrics

# Performance test utilities
class PerformanceTimer:
    """Simple performance timer for tests"""
    
    def __init__(self):
        self.start_time = None
        self.end_time = None
    
    def start(self):
        import time
        self.start_time = time.time()
    
    def stop(self):
        import time
        self.end_time = time.time()
    
    def elapsed(self) -> float:
        if self.start_time and self.end_time:
            return self.end_time - self.start_time
        return 0.0

# Test markers
pytestmark = [
    pytest.mark.asyncio,
    pytest.mark.integration
]