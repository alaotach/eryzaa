"""
Avalanche Blockchain Manager for Eryza GPU Monitoring
Connects to Avalanche C-Chain to fetch real GPU and subnet data
"""

import os
import json
import logging
from typing import Dict, List, Optional, Any, Tuple
import asyncio
from datetime import datetime, timedelta
from web3 import Web3
from web3.contract import Contract
from web3.exceptions import ContractLogicError, BlockNotFound
from dataclasses import dataclass
import time

logger = logging.getLogger(__name__)

@dataclass
class BlockchainConfig:
    """Avalanche blockchain configuration"""
    # Avalanche C-Chain RPC endpoints
    mainnet_rpc: str = "https://api.avax.network/ext/bc/C/rpc"
    testnet_rpc: str = "https://api.avax-test.network/ext/bc/C/rpc"
    local_rpc: str = "http://localhost:9650/ext/bc/C/rpc"
    
    # Chain IDs
    mainnet_chain_id: int = 43114
    testnet_chain_id: int = 43113
    local_chain_id: int = 43112
    
    # Contract addresses (to be configured)
    eryza_token_address: Optional[str] = None
    gpu_subnet_manager_address: Optional[str] = None
    
    # Connection settings
    request_timeout: int = 30
    max_retries: int = 3
    retry_delay: int = 2

class AvalancheBlockchainManager:
    """Manages connection to Avalanche blockchain and smart contract interactions"""
    
    def __init__(self, config: BlockchainConfig = None):
        self.config = config or BlockchainConfig()
        self.w3: Optional[Web3] = None
        self.eryza_token_contract: Optional[Contract] = None
        self.gpu_subnet_manager_contract: Optional[Contract] = None
        self.is_connected_flag = False
        self.current_network = "testnet"  # Default to testnet
        self.latest_block = 0
        
        # Event filters for real-time monitoring
        self.event_filters = {}
        self.monitored_events = [
            'GPURegistered',
            'GPURented', 
            'GPURentalEnded',
            'SubnetCreated',
            'GPUAddedToSubnet',
            'GPURemovedFromSubnet',
            'GPUMetricsUpdated'
        ]
    
    async def initialize(self, network: str = "testnet", custom_rpc: str = None):
        """Initialize connection to Avalanche blockchain"""
        try:
            # Determine RPC endpoint
            if custom_rpc:
                rpc_url = custom_rpc
            elif network == "mainnet":
                rpc_url = self.config.mainnet_rpc
            elif network == "local":
                rpc_url = self.config.local_rpc
            else:  # testnet
                rpc_url = self.config.testnet_rpc
            
            logger.info(f"Connecting to Avalanche {network} at {rpc_url}")
            
            # Create Web3 connection
            self.w3 = Web3(Web3.HTTPProvider(
                rpc_url,
                request_kwargs={'timeout': self.config.request_timeout}
            ))
            
            # Test connection
            if not self.w3.isConnected():
                raise ConnectionError("Failed to connect to Avalanche RPC")
            
            # Verify network
            chain_id = self.w3.eth.chain_id
            expected_chain_ids = {
                "mainnet": self.config.mainnet_chain_id,
                "testnet": self.config.testnet_chain_id,
                "local": self.config.local_chain_id
            }
            
            if chain_id != expected_chain_ids.get(network):
                logger.warning(f"Chain ID mismatch: expected {expected_chain_ids.get(network)}, got {chain_id}")
            
            self.current_network = network
            self.latest_block = self.w3.eth.block_number
            
            # Load contract ABIs and addresses
            await self._load_contracts()
            
            # Setup event monitoring
            await self._setup_event_monitoring()
            
            self.is_connected_flag = True
            logger.info(f"✅ Connected to Avalanche {network} (Chain ID: {chain_id}, Block: {self.latest_block})")
            
        except Exception as e:
            logger.error(f"Failed to initialize Avalanche connection: {e}")
            self.is_connected_flag = False
            raise
    
    async def _load_contracts(self):
        """Load smart contract instances"""
        try:
            # Load contract ABIs (you'll need to place these files in your project)
            eryza_token_abi = await self._load_contract_abi("EryzaToken")
            gpu_subnet_manager_abi = await self._load_contract_abi("EryzaGPUSubnetManager")
            
            # Get contract addresses from environment or config
            token_address = (
                os.getenv("ERYZA_TOKEN_ADDRESS") or 
                self.config.eryza_token_address or
                "0x1234567890123456789012345678901234567890"  # Placeholder
            )
            
            subnet_manager_address = (
                os.getenv("GPU_SUBNET_MANAGER_ADDRESS") or 
                self.config.gpu_subnet_manager_address or
                "0x0987654321098765432109876543210987654321"  # Placeholder
            )
            
            # Create contract instances
            if token_address and eryza_token_abi:
                self.eryza_token_contract = self.w3.eth.contract(
                    address=Web3.toChecksumAddress(token_address),
                    abi=eryza_token_abi
                )
                logger.info(f"✅ Loaded EryzaToken contract at {token_address}")
            
            if subnet_manager_address and gpu_subnet_manager_abi:
                self.gpu_subnet_manager_contract = self.w3.eth.contract(
                    address=Web3.toChecksumAddress(subnet_manager_address),
                    abi=gpu_subnet_manager_abi
                )
                logger.info(f"✅ Loaded GPUSubnetManager contract at {subnet_manager_address}")
                
        except Exception as e:
            logger.error(f"Failed to load contracts: {e}")
            # Continue without contracts for testing
    
    async def _load_contract_abi(self, contract_name: str) -> Optional[List]:
        """Load contract ABI from artifacts"""
        try:
            # Try to load from blockchain artifacts directory
            abi_paths = [
                f"blockchain/artifacts/contracts/{contract_name}.sol/{contract_name}.json",
                f"contract/{contract_name}.json",
                f"artifacts/{contract_name}.json"
            ]
            
            for abi_path in abi_paths:
                try:
                    if os.path.exists(abi_path):
                        with open(abi_path, 'r') as f:
                            contract_data = json.load(f)
                            return contract_data.get('abi', [])
                except Exception as e:
                    logger.debug(f"Could not load ABI from {abi_path}: {e}")
            
            # Return minimal ABI for testing
            logger.warning(f"Using minimal ABI for {contract_name}")
            return self._get_minimal_abi(contract_name)
            
        except Exception as e:
            logger.error(f"Failed to load ABI for {contract_name}: {e}")
            return None
    
    def _get_minimal_abi(self, contract_name: str) -> List:
        """Get minimal ABI for testing purposes"""
        if contract_name == "EryzaGPUSubnetManager":
            return [
                {
                    "inputs": [{"name": "gpu_id", "type": "string"}],
                    "name": "gpus",
                    "outputs": [
                        {"name": "gpu_id", "type": "string"},
                        {"name": "owner", "type": "address"},
                        {"name": "current_renter", "type": "address"},
                        {"name": "compute_power", "type": "uint256"},
                        {"name": "memory_size", "type": "uint256"},
                        {"name": "gpu_model", "type": "string"},
                        {"name": "active", "type": "bool"},
                        {"name": "rental_start", "type": "uint256"},
                        {"name": "rental_end", "type": "uint256"},
                        {"name": "current_subnet", "type": "bytes32"}
                    ],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [],
                    "name": "getAllGPUIds",
                    "outputs": [{"name": "", "type": "string[]"}],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [],
                    "name": "getAllSubnetIds", 
                    "outputs": [{"name": "", "type": "bytes32[]"}],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [{"name": "subnet_id", "type": "bytes32"}],
                    "name": "subnets",
                    "outputs": [
                        {"name": "subnet_id", "type": "bytes32"},
                        {"name": "coordinator", "type": "address"},
                        {"name": "gpu_ids", "type": "string[]"},
                        {"name": "total_compute", "type": "uint256"},
                        {"name": "total_memory", "type": "uint256"},
                        {"name": "created_at", "type": "uint256"},
                        {"name": "active", "type": "bool"},
                        {"name": "purpose", "type": "string"}
                    ],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [],
                    "name": "getSystemStats",
                    "outputs": [
                        {"name": "total_gpus", "type": "uint256"},
                        {"name": "rented_gpus", "type": "uint256"},
                        {"name": "active_subnets", "type": "uint256"},
                        {"name": "total_compute_power", "type": "uint256"}
                    ],
                    "stateMutability": "view",
                    "type": "function"
                }
            ]
        elif contract_name == "EryzaToken":
            return [
                {
                    "inputs": [],
                    "name": "totalSupply",
                    "outputs": [{"name": "", "type": "uint256"}],
                    "stateMutability": "view",
                    "type": "function"
                }
            ]
        return []
    
    async def _setup_event_monitoring(self):
        """Setup event filters for real-time monitoring"""
        if not self.gpu_subnet_manager_contract:
            logger.warning("GPU Subnet Manager contract not loaded, skipping event monitoring")
            return
        
        try:
            # Create event filters for monitored events
            latest_block = self.w3.eth.block_number
            
            for event_name in self.monitored_events:
                try:
                    event_filter = getattr(
                        self.gpu_subnet_manager_contract.events, 
                        event_name
                    ).createFilter(fromBlock=latest_block)
                    
                    self.event_filters[event_name] = event_filter
                    logger.debug(f"Created event filter for {event_name}")
                    
                except AttributeError:
                    logger.debug(f"Event {event_name} not found in contract ABI")
                except Exception as e:
                    logger.error(f"Failed to create filter for {event_name}: {e}")
                    
        except Exception as e:
            logger.error(f"Failed to setup event monitoring: {e}")
    
    def is_connected(self) -> bool:
        """Check if connected to Avalanche blockchain"""
        if not self.w3:
            return False
        
        try:
            # Test connection with a simple call
            current_block = self.w3.eth.block_number
            self.latest_block = current_block
            return True
        except Exception as e:
            logger.error(f"Connection check failed: {e}")
            self.is_connected_flag = False
            return False
    
    async def get_all_gpu_data(self) -> Dict[str, Dict[str, Any]]:
        """Fetch all GPU data from blockchain"""
        if not self.gpu_subnet_manager_contract:
            logger.warning("GPU Subnet Manager contract not available")
            return {}
        
        try:
            # Get all GPU IDs
            gpu_ids = await self._call_contract_function(
                self.gpu_subnet_manager_contract.functions.getAllGPUIds()
            )
            
            if not gpu_ids:
                logger.info("No GPUs found on blockchain")
                return {}
            
            gpu_data = {}
            
            # Fetch data for each GPU
            for gpu_id in gpu_ids:
                try:
                    gpu_info = await self._call_contract_function(
                        self.gpu_subnet_manager_contract.functions.gpus(gpu_id)
                    )
                    
                    if gpu_info:
                        gpu_data[gpu_id] = {
                            "gpu_id": gpu_info[0],
                            "owner": gpu_info[1],
                            "current_renter": gpu_info[2],
                            "compute_power": gpu_info[3],
                            "memory_size": gpu_info[4], 
                            "gpu_model": gpu_info[5],
                            "active": gpu_info[6],
                            "rental_start": gpu_info[7],
                            "rental_end": gpu_info[8],
                            "current_subnet": gpu_info[9].hex() if gpu_info[9] != b'\x00' * 32 else None,
                            "is_rented": gpu_info[2] != "0x0000000000000000000000000000000000000000",
                            "rental_active": (
                                gpu_info[2] != "0x0000000000000000000000000000000000000000" and
                                time.time() < gpu_info[8]
                            )
                        }
                        
                except Exception as e:
                    logger.error(f"Failed to fetch data for GPU {gpu_id}: {e}")
                    
            logger.info(f"Fetched data for {len(gpu_data)} GPUs from blockchain")
            return gpu_data
            
        except Exception as e:
            logger.error(f"Failed to get GPU data: {e}")
            return {}
    
    async def get_all_subnet_data(self) -> Dict[str, Dict[str, Any]]:
        """Fetch all subnet data from blockchain"""
        if not self.gpu_subnet_manager_contract:
            logger.warning("GPU Subnet Manager contract not available")
            return {}
        
        try:
            # Get all subnet IDs
            subnet_ids = await self._call_contract_function(
                self.gpu_subnet_manager_contract.functions.getAllSubnetIds()
            )
            
            if not subnet_ids:
                logger.info("No subnets found on blockchain")
                return {}
            
            subnet_data = {}
            
            # Fetch data for each subnet
            for subnet_id in subnet_ids:
                try:
                    subnet_info = await self._call_contract_function(
                        self.gpu_subnet_manager_contract.functions.subnets(subnet_id)
                    )
                    
                    if subnet_info and subnet_info[6]:  # Check if active
                        subnet_data[subnet_id.hex()] = {
                            "subnet_id": subnet_id.hex(),
                            "coordinator": subnet_info[1],
                            "gpu_ids": subnet_info[2],
                            "total_compute": subnet_info[3],
                            "total_memory": subnet_info[4],
                            "created_at": subnet_info[5],
                            "active": subnet_info[6],
                            "purpose": subnet_info[7],
                            "gpu_count": len(subnet_info[2])
                        }
                        
                except Exception as e:
                    logger.error(f"Failed to fetch data for subnet {subnet_id.hex()}: {e}")
                    
            logger.info(f"Fetched data for {len(subnet_data)} subnets from blockchain")
            return subnet_data
            
        except Exception as e:
            logger.error(f"Failed to get subnet data: {e}")
            return {}
    
    async def get_system_stats(self) -> Dict[str, Any]:
        """Get system statistics from blockchain"""
        if not self.gpu_subnet_manager_contract:
            logger.warning("GPU Subnet Manager contract not available")
            return {}
        
        try:
            stats = await self._call_contract_function(
                self.gpu_subnet_manager_contract.functions.getSystemStats()
            )
            
            if stats:
                return {
                    "total_gpus": stats[0],
                    "rented_gpus": stats[1],
                    "active_subnets": stats[2],
                    "total_compute_power": stats[3],
                    "available_gpus": stats[0] - stats[1],
                    "blockchain_connected": True,
                    "latest_block": self.latest_block,
                    "network": self.current_network
                }
            
        except Exception as e:
            logger.error(f"Failed to get system stats: {e}")
        
        return {
            "blockchain_connected": self.is_connected(),
            "latest_block": self.latest_block,
            "network": self.current_network
        }
    
    async def get_recent_events(self, event_types: List[str] = None) -> List[Dict[str, Any]]:
        """Get recent blockchain events"""
        if not self.event_filters:
            return []
        
        events = []
        event_types = event_types or self.monitored_events
        
        for event_name in event_types:
            if event_name not in self.event_filters:
                continue
                
            try:
                new_entries = self.event_filters[event_name].get_new_entries()
                
                for entry in new_entries:
                    events.append({
                        "event": event_name,
                        "block_number": entry.blockNumber,
                        "transaction_hash": entry.transactionHash.hex(),
                        "args": dict(entry.args),
                        "timestamp": datetime.now().isoformat()
                    })
                    
            except Exception as e:
                logger.error(f"Failed to get events for {event_name}: {e}")
        
        return sorted(events, key=lambda x: x["block_number"])
    
    async def _call_contract_function(self, function_call, max_retries: int = None):
        """Call contract function with retry logic"""
        max_retries = max_retries or self.config.max_retries
        
        for attempt in range(max_retries):
            try:
                return function_call.call()
            except Exception as e:
                if attempt == max_retries - 1:
                    raise e
                
                logger.warning(f"Contract call attempt {attempt + 1} failed: {e}")
                await asyncio.sleep(self.config.retry_delay)
        
        return None
    
    async def disconnect(self):
        """Disconnect from blockchain"""
        self.is_connected_flag = False
        self.w3 = None
        self.eryza_token_contract = None
        self.gpu_subnet_manager_contract = None
        self.event_filters = {}
        logger.info("Disconnected from Avalanche blockchain")

# Global instance
avalanche_blockchain_manager = AvalancheBlockchainManager()