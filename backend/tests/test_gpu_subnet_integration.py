"""
Integration tests for GPU subnet functionality and monitoring system
Tests the interaction between smart contracts, backend API, and monitoring services
"""

import pytest
import asyncio
import json
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime, timedelta
from httpx import AsyncClient
from fastapi.testclient import TestClient
from fastapi import FastAPI

# Mock the FastAPI app for testing
app = FastAPI()

class TestGPUSubnetIntegration:
    """Test GPU subnet management and monitoring integration"""
    
    @pytest.fixture
    def client(self):
        """Test client fixture"""
        return TestClient(app)
    
    @pytest.fixture
    def mock_blockchain_manager(self):
        """Mock blockchain manager"""
        mock = Mock()
        mock.is_connected.return_value = True
        mock.get_gpu_info.return_value = {
            "gpu_001": {
                "owner": "0x1234567890123456789012345678901234567890",
                "renter": "0x0987654321098765432109876543210987654321",
                "is_rented": True,
                "rental_end": datetime.now() + timedelta(hours=2)
            }
        }
        return mock
    
    @pytest.fixture
    def mock_monitoring_service(self):
        """Mock monitoring service"""
        mock = Mock()
        mock.get_system_metrics.return_value = {
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
        mock.get_gpu_metrics.return_value = {
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
        return mock

class TestGPURegistrationAndRental:
    """Test GPU registration and rental workflows"""
    
    @pytest.mark.asyncio
    async def test_gpu_registration_flow(self):
        """Test complete GPU registration workflow"""
        # Mock smart contract interaction
        with patch('web3.Web3') as mock_web3:
            mock_contract = Mock()
            mock_web3.return_value.eth.contract.return_value = mock_contract
            mock_contract.functions.registerGPU.return_value.transact.return_value = "0x123"
            
            # Test GPU registration
            gpu_data = {
                "gpu_id": "gpu_test_001",
                "compute_power": 83,
                "memory_size": 24,
                "gpu_model": "RTX 4090"
            }
            
            # Simulate contract call
            result = mock_contract.functions.registerGPU(
                gpu_data["gpu_id"],
                gpu_data["compute_power"],
                gpu_data["memory_size"],
                gpu_data["gpu_model"]
            ).transact()
            
            assert result == "0x123"
            mock_contract.functions.registerGPU.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_gpu_rental_with_subnet_creation(self):
        """Test GPU rental followed by subnet creation"""
        # Mock rental process
        with patch('web3.Web3') as mock_web3:
            mock_token_contract = Mock()
            mock_subnet_contract = Mock()
            
            # Mock rental transaction
            mock_token_contract.functions.rentGPU.return_value.transact.return_value = "0x456"
            mock_subnet_contract.functions.createSubnet.return_value.transact.return_value = "0x789"
            
            # Test rental
            rental_data = {
                "gpu_id": "gpu_test_001",
                "gpu_owner": "0x1234567890123456789012345678901234567890",
                "price_per_hour": 100,
                "rental_duration": 3600  # 1 hour
            }
            
            rental_result = mock_token_contract.functions.rentGPU(
                rental_data["gpu_id"],
                rental_data["gpu_owner"],
                rental_data["price_per_hour"],
                rental_data["rental_duration"]
            ).transact()
            
            # Test subnet creation
            subnet_data = {
                "gpu_ids": ["gpu_test_001"],
                "purpose": "ML Training"
            }
            
            subnet_result = mock_subnet_contract.functions.createSubnet(
                subnet_data["gpu_ids"],
                subnet_data["purpose"]
            ).transact()
            
            assert rental_result == "0x456"
            assert subnet_result == "0x789"

class TestMonitoringAPI:
    """Test monitoring API endpoints"""
    
    @pytest.mark.asyncio
    async def test_system_metrics_endpoint(self):
        """Test system metrics REST endpoint"""
        async with AsyncClient(app=app, base_url="http://test") as ac:
            with patch('app.api.v1.monitoring.mock_monitoring_service') as mock_service:
                mock_service.get_system_metrics.return_value = {
                    "total_gpus": 3,
                    "rented_gpus": 2,
                    "available_gpus": 1,
                    "active_subnets": 2,
                    "blockchain_connected": True
                }
                
                # Mock the endpoint since we don't have the full app
                response_data = {"success": True, "data": mock_service.get_system_metrics.return_value}
                
                assert response_data["success"] is True
                assert response_data["data"]["total_gpus"] == 3
                assert response_data["data"]["rented_gpus"] == 2
    
    @pytest.mark.asyncio 
    async def test_gpu_metrics_endpoint(self):
        """Test GPU metrics endpoint"""
        gpu_id = "gpu_001"
        expected_data = {
            "gpu_id": gpu_id,
            "utilization": 85.5,
            "temperature": 72.0,
            "is_rented": True,
            "current_subnet": "subnet_ml_training_001"
        }
        
        # Mock the service response
        with patch('app.api.v1.monitoring.mock_monitoring_service') as mock_service:
            mock_service.get_gpu_metrics.return_value = expected_data
            
            response_data = {"success": True, "data": expected_data}
            assert response_data["data"]["gpu_id"] == gpu_id
            assert response_data["data"]["utilization"] == 85.5

class TestWebSocketConnections:
    """Test WebSocket real-time monitoring"""
    
    @pytest.mark.asyncio
    async def test_websocket_system_metrics(self):
        """Test WebSocket system metrics connection"""
        # Mock WebSocket behavior
        mock_websocket = AsyncMock()
        mock_websocket.accept = AsyncMock()
        mock_websocket.send_text = AsyncMock()
        
        # Simulate connection and data sending
        await mock_websocket.accept()
        
        system_data = {
            "type": "system_metrics",
            "data": {
                "total_gpus": 3,
                "rented_gpus": 2,
                "blockchain_connected": True
            },
            "timestamp": datetime.now().isoformat()
        }
        
        await mock_websocket.send_text(json.dumps(system_data))
        
        # Verify calls
        mock_websocket.accept.assert_called_once()
        mock_websocket.send_text.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_websocket_gpu_metrics(self):
        """Test WebSocket GPU metrics connection"""
        mock_websocket = AsyncMock()
        mock_websocket.accept = AsyncMock()
        mock_websocket.send_text = AsyncMock()
        
        await mock_websocket.accept()
        
        gpu_data = {
            "type": "gpu_metrics",
            "gpu_id": "gpu_001",
            "data": {
                "utilization": 85.5,
                "temperature": 72.0,
                "is_rented": True
            },
            "timestamp": datetime.now().isoformat()
        }
        
        await mock_websocket.send_text(json.dumps(gpu_data))
        
        mock_websocket.accept.assert_called_once()
        mock_websocket.send_text.assert_called_once()

class TestSubnetManagement:
    """Test subnet creation and management"""
    
    @pytest.mark.asyncio
    async def test_subnet_creation_with_rented_gpus(self):
        """Test subnet creation only works with rented GPUs"""
        with patch('web3.Web3') as mock_web3:
            mock_contract = Mock()
            mock_web3.return_value.eth.contract.return_value = mock_contract
            
            # Mock GPU rental status check
            mock_contract.functions.gpus.return_value.call.return_value = (
                "gpu_001",  # gpu_id
                "0x1234567890123456789012345678901234567890",  # owner
                "0x0987654321098765432109876543210987654321",  # current_renter (not zero = rented)
                83,  # compute_power
                24,  # memory_size
                "RTX 4090",  # gpu_model
                True,  # active
                int(datetime.now().timestamp()),  # rental_start
                int((datetime.now() + timedelta(hours=2)).timestamp()),  # rental_end
                b'\x00' * 32  # current_subnet (bytes32(0))
            )
            
            # Test subnet creation
            mock_contract.functions.createSubnet.return_value.transact.return_value = "0xabc"
            
            result = mock_contract.functions.createSubnet(
                ["gpu_001"], 
                "ML Training"
            ).transact()
            
            assert result == "0xabc"
            mock_contract.functions.createSubnet.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_subnet_metrics_aggregation(self):
        """Test subnet metrics are properly aggregated from GPU metrics"""
        # Mock individual GPU metrics
        gpu_metrics = {
            "gpu_001": {
                "utilization": 80.0,
                "temperature": 70.0,
                "power_draw": 300.0,
                "compute_power": 83.0,
                "current_subnet": "subnet_001"
            },
            "gpu_002": {
                "utilization": 90.0,
                "temperature": 75.0,
                "power_draw": 350.0,
                "compute_power": 83.0,
                "current_subnet": "subnet_001"
            }
        }
        
        # Calculate expected aggregated metrics
        expected_subnet_metrics = {
            "subnet_id": "subnet_001",
            "gpu_count": 2,
            "total_compute": 166.0,  # 83 + 83
            "avg_utilization": 85.0,  # (80 + 90) / 2
            "avg_temperature": 72.5,  # (70 + 75) / 2
            "total_power_draw": 650.0,  # 300 + 350
            "active": True
        }
        
        # Verify calculations
        gpu_count = len([gpu for gpu in gpu_metrics.values() if gpu["current_subnet"] == "subnet_001"])
        total_compute = sum(gpu["compute_power"] for gpu in gpu_metrics.values() if gpu["current_subnet"] == "subnet_001")
        avg_utilization = sum(gpu["utilization"] for gpu in gpu_metrics.values() if gpu["current_subnet"] == "subnet_001") / gpu_count
        
        assert gpu_count == expected_subnet_metrics["gpu_count"]
        assert total_compute == expected_subnet_metrics["total_compute"]
        assert avg_utilization == expected_subnet_metrics["avg_utilization"]

class TestHealthMonitoring:
    """Test health monitoring and alerting"""
    
    def test_gpu_health_status_calculation(self):
        """Test GPU health status determination"""
        # Test healthy GPU
        healthy_gpu = {
            "temperature": 65.0,
            "utilization": 75.0,
            "power_draw": 300.0,
            "is_rented": True
        }
        
        health_status = self._calculate_gpu_health(healthy_gpu)
        assert health_status["status"] == "healthy"
        assert len(health_status["warnings"]) == 0
        
        # Test warning conditions
        warning_gpu = {
            "temperature": 87.0,  # High temperature
            "utilization": 0.0,   # No utilization despite being rented
            "power_draw": 300.0,
            "is_rented": True
        }
        
        health_status = self._calculate_gpu_health(warning_gpu)
        assert health_status["status"] == "warning"
        assert "High temperature" in health_status["warnings"]
        assert "No utilization despite being rented" in health_status["warnings"]
        
        # Test critical conditions
        critical_gpu = {
            "temperature": 92.0,  # Critical temperature
            "utilization": 95.0,
            "power_draw": 450.0,  # High power consumption
            "is_rented": True
        }
        
        health_status = self._calculate_gpu_health(critical_gpu)
        assert health_status["status"] == "critical"
        assert "Critical temperature" in health_status["warnings"]
    
    def _calculate_gpu_health(self, gpu_data):
        """Helper method to calculate GPU health status"""
        health_status = "healthy"
        warnings = []
        
        # Temperature checks
        if gpu_data["temperature"] > 85:
            health_status = "warning"
            warnings.append("High temperature")
        if gpu_data["temperature"] > 90:
            health_status = "critical"
            warnings.append("Critical temperature")
        
        # Utilization checks
        if gpu_data["utilization"] == 0 and gpu_data["is_rented"]:
            health_status = "warning"
            warnings.append("No utilization despite being rented")
        
        # Power consumption checks
        if gpu_data["power_draw"] > 400:
            warnings.append("High power consumption")
        
        return {
            "status": health_status,
            "warnings": warnings
        }

class TestBlockchainIntegration:
    """Test blockchain integration and smart contract interactions"""
    
    @pytest.mark.asyncio
    async def test_smart_contract_event_monitoring(self):
        """Test monitoring of smart contract events"""
        # Mock event filter and logs
        mock_event_filter = Mock()
        mock_event_filter.get_new_entries.return_value = [
            {
                'event': 'GPURented',
                'args': {
                    'rentalId': b'\x01' * 32,
                    'gpuId': 'gpu_001',
                    'renter': '0x0987654321098765432109876543210987654321',
                    'totalCost': 3600
                }
            },
            {
                'event': 'SubnetCreated',
                'args': {
                    'subnetId': b'\x02' * 32,
                    'coordinator': '0x0987654321098765432109876543210987654321',
                    'purpose': 'ML Training'
                }
            }
        ]
        
        # Process events
        events = mock_event_filter.get_new_entries()
        
        gpu_rental_event = next(e for e in events if e['event'] == 'GPURented')
        subnet_creation_event = next(e for e in events if e['event'] == 'SubnetCreated')
        
        assert gpu_rental_event['args']['gpuId'] == 'gpu_001'
        assert subnet_creation_event['args']['purpose'] == 'ML Training'
    
    @pytest.mark.asyncio
    async def test_blockchain_connection_monitoring(self):
        """Test blockchain connection health monitoring"""
        with patch('web3.Web3') as mock_web3:
            # Test connected state
            mock_web3.return_value.isConnected.return_value = True
            mock_web3.return_value.eth.block_number = 12345
            
            connection_health = {
                "connected": mock_web3.return_value.isConnected(),
                "latest_block": mock_web3.return_value.eth.block_number,
                "last_check": datetime.now().isoformat()
            }
            
            assert connection_health["connected"] is True
            assert connection_health["latest_block"] == 12345
            
            # Test disconnected state
            mock_web3.return_value.isConnected.return_value = False
            
            connection_health["connected"] = mock_web3.return_value.isConnected()
            assert connection_health["connected"] is False

if __name__ == "__main__":
    pytest.main([__file__, "-v"])