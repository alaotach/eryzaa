import asyncio
import json
import subprocess
import psutil
import docker
import websockets
import aiohttp
from datetime import datetime
from typing import Dict, List, Any, Optional
from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import uvicorn
from web3 import Web3
from eth_account import Account

app = FastAPI(title="Eryza Rental Server API", version="1.0.0")

# CORS middleware to allow web dashboard access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Blockchain configuration
AVALANCHE_FUJI_RPC = "https://api.avax-test.network/ext/bc/C/rpc"
CONTRACT_ADDRESSES = {
    "ERYZA_TOKEN": "0x742d35Cc6634C0532925a3b8D6C5db",  # Placeholder - update after deployment
    "COMPUTE_MARKETPLACE": "0x742d35Cc6634C0532925a3b8D6C5db",  # Placeholder
    "STAKING": "0x742d35Cc6634C0532925a3b8D6C5db",  # Placeholder
}

# Simplified ABIs for Python integration
MARKETPLACE_ABI = [
    {
        "inputs": [{"type": "string", "name": "nodeType"}],
        "name": "getAvailableNodes",
        "outputs": [{"type": "uint256[]"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"type": "uint256", "name": "nodeId"}],
        "name": "getNodeInfo",
        "outputs": [{"type": "tuple", "components": [
            {"type": "address", "name": "provider"},
            {"type": "string", "name": "nodeType"},
            {"type": "uint256", "name": "cpuCores"},
            {"type": "uint256", "name": "memoryGB"},
            {"type": "uint256", "name": "gpuCount"},
            {"type": "string", "name": "gpuType"},
            {"type": "uint256", "name": "pricePerHour"},
            {"type": "bool", "name": "available"},
            {"type": "uint256", "name": "totalJobs"},
            {"type": "uint256", "name": "successfulJobs"},
            {"type": "string", "name": "endpoint"}
        ]}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"type": "address", "name": "client"}],
        "name": "getClientJobs",
        "outputs": [{"type": "uint256[]"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"type": "uint256", "name": "jobId"}],
        "name": "getJobInfo",
        "outputs": [{"type": "tuple", "components": [
            {"type": "uint256", "name": "nodeId"},
            {"type": "address", "name": "client"},
            {"type": "address", "name": "provider"},
            {"type": "uint256", "name": "duration"},
            {"type": "uint256", "name": "totalCost"},
            {"type": "uint256", "name": "startTime"},
            {"type": "uint256", "name": "endTime"},
            {"type": "uint8", "name": "status"},
            {"type": "string", "name": "jobType"},
            {"type": "string", "name": "jobConfig"},
            {"type": "bool", "name": "disputed"},
            {"type": "address", "name": "disputer"},
            {"type": "string", "name": "disputeReason"}
        ]}],
        "stateMutability": "view",
        "type": "function"
    }
]

TOKEN_ABI = [
    {
        "inputs": [{"type": "address", "name": "account"}],
        "name": "balanceOf",
        "outputs": [{"type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "totalSupply",
        "outputs": [{"type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    }
]

# Global state
connected_clients = set()
rental_db = {}

class BlockchainService:
    def __init__(self):
        try:
            self.w3 = Web3(Web3.HTTPProvider(AVALANCHE_FUJI_RPC))
            self.marketplace_contract = self.w3.eth.contract(
                address=CONTRACT_ADDRESSES["COMPUTE_MARKETPLACE"], 
                abi=MARKETPLACE_ABI
            )
            self.token_contract = self.w3.eth.contract(
                address=CONTRACT_ADDRESSES["ERYZA_TOKEN"], 
                abi=TOKEN_ABI
            )
            self.connected = self.w3.is_connected()
            print(f"Blockchain connection: {'✅ Connected' if self.connected else '❌ Failed'}")
        except Exception as e:
            print(f"Blockchain connection error: {e}")
            self.connected = False
            self.w3 = None
            self.marketplace_contract = None
            self.token_contract = None

    async def get_available_nodes(self, node_type: str = "") -> List[Dict]:
        """Get available compute nodes from blockchain"""
        if not self.connected:
            return self._get_mock_nodes()
        
        try:
            if node_type:
                node_ids = self.marketplace_contract.functions.getAvailableNodes(node_type).call()
            else:
                # Get all types
                all_nodes = []
                for ntype in ["ssh", "training", "edge", "inference"]:
                    try:
                        nodes = self.marketplace_contract.functions.getAvailableNodes(ntype).call()
                        all_nodes.extend(nodes)
                    except:
                        continue
                node_ids = all_nodes
            
            # Get detailed info for each node
            nodes = []
            for node_id in node_ids[:10]:  # Limit to avoid timeout
                try:
                    node_info = self.marketplace_contract.functions.getNodeInfo(node_id).call()
                    nodes.append({
                        "id": node_id,
                        "provider": node_info[0],
                        "nodeType": node_info[1],
                        "cpuCores": node_info[2],
                        "memoryGB": node_info[3],
                        "gpuCount": node_info[4],
                        "gpuType": node_info[5],
                        "pricePerHour": str(self.w3.from_wei(node_info[6], 'ether')),
                        "available": node_info[7],
                        "totalJobs": node_info[8],
                        "successfulJobs": node_info[9],
                        "endpoint": node_info[10],
                        "reliability": (node_info[9] / max(node_info[8], 1)) * 100  # Success rate
                    })
                except Exception as e:
                    print(f"Error fetching node {node_id}: {e}")
                    continue
            
            return nodes
        except Exception as e:
            print(f"Error fetching nodes from blockchain: {e}")
            return self._get_mock_nodes()

    async def get_user_jobs(self, user_address: str) -> List[Dict]:
        """Get user's jobs from blockchain"""
        if not self.connected or not user_address:
            return self._get_mock_jobs()
        
        try:
            job_ids = self.marketplace_contract.functions.getClientJobs(user_address).call()
            
            jobs = []
            for job_id in job_ids[-20:]:  # Get last 20 jobs
                try:
                    job_info = self.marketplace_contract.functions.getJobInfo(job_id).call()
                    jobs.append({
                        "id": job_id,
                        "nodeId": job_info[0],
                        "client": job_info[1],
                        "provider": job_info[2],
                        "duration": job_info[3],
                        "totalCost": str(self.w3.from_wei(job_info[4], 'ether')),
                        "startTime": job_info[5],
                        "endTime": job_info[6],
                        "status": self._format_job_status(job_info[7]),
                        "jobType": job_info[8],
                        "jobConfig": job_info[9],
                        "disputed": job_info[10],
                        "disputer": job_info[11],
                        "disputeReason": job_info[12],
                    })
                except Exception as e:
                    print(f"Error fetching job {job_id}: {e}")
                    continue
            
            return jobs
        except Exception as e:
            print(f"Error fetching jobs from blockchain: {e}")
            return self._get_mock_jobs()

    async def get_token_balance(self, address: str) -> Dict:
        """Get token balance for address"""
        if not self.connected or not address:
            return {"balance": "0", "symbol": "ERYZA"}
        
        try:
            balance = self.token_contract.functions.balanceOf(address).call()
            return {
                "balance": str(self.w3.from_wei(balance, 'ether')),
                "symbol": "ERYZA",
                "address": address
            }
        except Exception as e:
            print(f"Error fetching token balance: {e}")
            return {"balance": "0", "symbol": "ERYZA"}

    async def get_marketplace_stats(self) -> Dict:
        """Get overall marketplace statistics"""
        try:
            nodes = await self.get_available_nodes()
            active_nodes = len([n for n in nodes if n["available"]])
            total_jobs = sum(n["totalJobs"] for n in nodes)
            
            return {
                "totalNodes": len(nodes),
                "activeNodes": active_nodes,
                "totalJobs": total_jobs,
                "avgReliability": sum(n["reliability"] for n in nodes) / len(nodes) if nodes else 0
            }
        except Exception as e:
            print(f"Error fetching marketplace stats: {e}")
            return {
                "totalNodes": 3,
                "activeNodes": 2,
                "totalJobs": 15,
                "avgReliability": 95.5
            }

    def _format_job_status(self, status_code: int) -> str:
        statuses = ["Created", "Funded", "Started", "Completed", "Cancelled", "Disputed"]
        return statuses[status_code] if status_code < len(statuses) else "Unknown"

    def _get_mock_nodes(self) -> List[Dict]:
        """Fallback mock data when blockchain is unavailable"""
        return [
            {
                "id": 1,
                "provider": "0x742d35Cc6634C0532925a3b8D6C5db11A85d91B2",
                "nodeType": "training",
                "cpuCores": 32,
                "memoryGB": 128,
                "gpuCount": 4,
                "gpuType": "RTX 4090",
                "pricePerHour": "0.5",
                "available": True,
                "totalJobs": 25,
                "successfulJobs": 24,
                "endpoint": "192.168.194.76",
                "reliability": 96.0
            },
            {
                "id": 2,
                "provider": "0x8ba1f109551bD432803012645Hac136c5db22f0",
                "nodeType": "ssh",
                "cpuCores": 16,
                "memoryGB": 64,
                "gpuCount": 2,
                "gpuType": "RTX 3080",
                "pricePerHour": "0.25",
                "available": True,
                "totalJobs": 18,
                "successfulJobs": 17,
                "endpoint": "192.168.194.32",
                "reliability": 94.4
            }
        ]

    def _get_mock_jobs(self) -> List[Dict]:
        """Fallback mock job data"""
        return [
            {
                "id": 1,
                "nodeId": 1,
                "client": "0x742d35Cc6634C0532925a3b8D6C5db11A85d91B2",
                "provider": "0x8ba1f109551bD432803012645Hac136c5db22f0",
                "duration": 4,
                "totalCost": "2.0",
                "startTime": int(datetime.now().timestamp()) - 3600,
                "endTime": 0,
                "status": "Started",
                "jobType": "training",
                "jobConfig": "ML model training job",
                "disputed": False,
                "disputer": "0x0000000000000000000000000000000000000000",
                "disputeReason": ""
            }
        ]

class SystemMonitor:
    def __init__(self):
        try:
            self.docker_client = docker.from_env()
        except Exception as e:
            print(f"Warning: Docker client failed to initialize: {e}")
            self.docker_client = None
        
        self.blockchain = BlockchainService()
    
    async def get_system_stats(self) -> Dict[str, Any]:
        """Get comprehensive system statistics including blockchain data"""
        # CPU and Memory
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Network stats
        network = psutil.net_io_counters()
        
        # Docker containers
        containers = []
        try:
            if self.docker_client:
                for container in self.docker_client.containers.list():
                    containers.append({
                        "name": container.name,
                        "status": container.status,
                        "ports": str(container.ports) if container.ports else "",
                        "uptime": self.get_container_uptime(container)
                    })
        except Exception as e:
            print(f"Docker error: {e}")
            # Add mock data if Docker isn't available
            containers = [
                {"name": "rental-dev", "status": "running", "ports": "3000:3000", "uptime": "2h 15m"},
                {"name": "eryzaa-web", "status": "running", "ports": "5173:5173", "uptime": "2h 15m"}
            ]
        
        # ZeroTier status
        zerotier_status = self.get_zerotier_status()
        
        # Blockchain data
        try:
            marketplace_stats = await self.blockchain.get_marketplace_stats()
            available_nodes = await self.blockchain.get_available_nodes()
            active_rentals = [n for n in available_nodes if not n["available"]]  # Simplified
        except Exception as e:
            print(f"Blockchain data error: {e}")
            marketplace_stats = {"totalNodes": 0, "activeNodes": 0, "totalJobs": 0}
            active_rentals = []
        
        return {
            "containers": containers,
            "zerotierStatus": zerotier_status,
            "systemResources": {
                "cpu": cpu_percent,
                "memory": memory.percent,
                "disk": disk.percent,
                "network": {
                    "rx": network.bytes_recv,
                    "tx": network.bytes_sent
                }
            },
            "blockchainStats": marketplace_stats,
            "activeRentals": active_rentals[:5],  # Limit to 5 for display
            "uptime": self.get_system_uptime(),
            "timestamp": datetime.now().isoformat(),
            "blockchainConnected": self.blockchain.connected
        }
    
    def get_container_uptime(self, container) -> str:
        """Get container uptime"""
        try:
            created = container.attrs['Created']
            # Parse creation time and calculate uptime
            # This is simplified - in production you'd parse the ISO timestamp
            return "Running"
        except:
            return "Unknown"
    
    def get_zerotier_status(self) -> Dict[str, Any]:
        """Get ZeroTier network status"""
        try:
            # Try to get ZeroTier status
            result = subprocess.run(['sudo', 'zerotier-cli', 'listnetworks'], 
                                  capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                lines = result.stdout.strip().split('\n')
                for line in lines[1:]:  # Skip header
                    if '363c67c55ad2489d' in line:
                        parts = line.split()
                        return {
                            "networkId": "363c67c55ad2489d",
                            "status": "OK" if "OK" in line else "WAITING",
                            "ip": parts[8].split('/')[0] if len(parts) > 8 and parts[8] != '-' else "Not assigned",
                            "peers": 3  # Mock peer count
                        }
            
            return {
                "networkId": "363c67c55ad2489d",
                "status": "OFFLINE",
                "ip": "Not connected",
                "peers": 0
            }
        except Exception:
            return {
                "networkId": "363c67c55ad2489d",
                "status": "UNKNOWN",
                "ip": "Error checking",
                "peers": 0
            }
    
    def get_system_uptime(self) -> str:
        """Get system uptime"""
        try:
            with open('/proc/uptime', 'r') as f:
                uptime_seconds = float(f.readline().split()[0])
            hours = int(uptime_seconds // 3600)
            minutes = int((uptime_seconds % 3600) // 60)
            return f"{hours}h {minutes}m"
        except:
            return "Unknown"

monitor = SystemMonitor()

@app.get("/")
async def root():
    return {"message": "Eryzaa Rental Server API", "status": "running", "blockchain": monitor.blockchain.connected}

@app.get("/api/stats")
async def get_stats():
    """Get current system statistics"""
    return await monitor.get_system_stats()

@app.get("/api/nodes")
async def get_available_nodes(node_type: Optional[str] = None):
    """Get available compute nodes from blockchain"""
    return await monitor.blockchain.get_available_nodes(node_type or "")

@app.get("/api/jobs/{address}")
async def get_user_jobs(address: str):
    """Get user's jobs from blockchain"""
    return await monitor.blockchain.get_user_jobs(address)

@app.get("/api/balance/{address}")
async def get_token_balance(address: str):
    """Get user's token balance"""
    return await monitor.blockchain.get_token_balance(address)

@app.get("/api/marketplace")
async def get_marketplace_stats():
    """Get marketplace statistics"""
    return await monitor.blockchain.get_marketplace_stats()

@app.get("/api/rentals")
async def get_rentals():
    """Get all rental information from blockchain"""
    try:
        nodes = await monitor.blockchain.get_available_nodes()
        # Convert nodes to rental format for compatibility
        rentals = []
        for node in nodes:
            if not node["available"] and node["totalJobs"] > 0:  # Active rental
                rentals.append({
                    "id": f"rent_{node['id']:03d}",
                    "client": node["provider"][:10] + "...",
                    "duration": "2h 30m",  # Mock duration
                    "status": "active",
                    "gpu": node["gpuType"],
                    "nodeId": node["id"],
                    "created_at": datetime.now().isoformat()
                })
        return rentals
    except Exception as e:
        print(f"Error fetching rentals: {e}")
        return []

@app.post("/api/command")
async def execute_command(command_data: dict):
    """Execute system commands safely"""
    command = command_data.get("command", "").lower().strip()
    
    if command == "status":
        return {"output": await monitor.get_system_stats()}
    elif command == "nodes":
        nodes = await monitor.blockchain.get_available_nodes()
        return {"output": [f"Node {n['id']}: {n['nodeType']} - {n['gpuType']}" for n in nodes]}
    elif command == "blockchain":
        return {"output": [
            f"Blockchain Status: {'Connected' if monitor.blockchain.connected else 'Disconnected'}",
            f"RPC: {AVALANCHE_FUJI_RPC}",
            f"Marketplace: {CONTRACT_ADDRESSES['COMPUTE_MARKETPLACE'][:10]}...",
            f"Token: {CONTRACT_ADDRESSES['ERYZA_TOKEN'][:10]}..."
        ]}
    elif command == "restart":
        return {"output": "Restart command received - would restart services"}
    elif command == "logs":
        try:
            # Get recent Docker logs
            logs = []
            if monitor.docker_client:
                for container in monitor.docker_client.containers.list():
                    recent_logs = container.logs(tail=5).decode('utf-8')
                    logs.append(f"=== {container.name} ===")
                    logs.extend(recent_logs.split('\n')[-5:])
            else:
                logs = ["Docker not available - showing mock logs",
                       "[2024-01-15 14:30:15] Rental server started",
                       "[2024-01-15 14:32:22] API endpoints initialized",
                       "[2024-01-15 14:35:10] ZeroTier connection established",
                       f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Blockchain: {'Connected' if monitor.blockchain.connected else 'Disconnected'}"]
            return {"output": logs}
        except:
            return {"output": ["Error retrieving logs"]}
    else:
        return {"output": [f"Command not supported: {command}"]}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates"""
    await websocket.accept()
    connected_clients.add(websocket)
    
    try:
        # Send initial data
        stats = await monitor.get_system_stats()
        await websocket.send_text(json.dumps({"type": "stats", "data": stats}))
        
        # Keep connection alive and handle incoming messages
        async for message in websocket.iter_text():
            try:
                data = json.loads(message)
                if data.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
                elif data.get("type") == "get_stats":
                    stats = await monitor.get_system_stats()
                    await websocket.send_text(json.dumps({"type": "stats", "data": stats}))
                elif data.get("type") == "get_nodes":
                    nodes = await monitor.blockchain.get_available_nodes()
                    await websocket.send_text(json.dumps({"type": "nodes", "data": nodes}))
            except json.JSONDecodeError:
                pass
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        connected_clients.discard(websocket)

async def broadcast_update(message: dict):
    """Broadcast updates to all connected WebSocket clients"""
    if connected_clients:
        disconnected = []
        for client in connected_clients:
            try:
                await client.send_text(json.dumps(message))
            except:
                disconnected.append(client)
        
        # Remove disconnected clients
        for client in disconnected:
            connected_clients.discard(client)

async def periodic_stats_broadcast():
    """Periodically broadcast system stats to connected clients"""
    while True:
        try:
            await asyncio.sleep(10)  # Update every 10 seconds for blockchain data
            if connected_clients:
                stats = await monitor.get_system_stats()
                await broadcast_update({"type": "stats", "data": stats})
        except Exception as e:
            print(f"Periodic broadcast error: {e}")

if __name__ == "__main__":
    # Run the server
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
