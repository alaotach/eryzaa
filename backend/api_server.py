import asyncio
import json
import subprocess
import psutil
import docker
import websockets
from datetime import datetime
from typing import Dict, List, Any
from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import uvicorn

app = FastAPI(title="Eryza Rental Server API", version="1.0.0")

# CORS middleware to allow web dashboard access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state
connected_clients = set()
system_stats = {}
rental_db = {}

class SystemMonitor:
    def __init__(self):
        try:
            self.docker_client = docker.from_env()
        except Exception as e:
            print(f"Warning: Docker client failed to initialize: {e}")
            self.docker_client = None
    
    def get_system_stats(self) -> Dict[str, Any]:
        """Get comprehensive system statistics"""
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
            "activeRentals": list(rental_db.values()),
            "uptime": self.get_system_uptime(),
            "timestamp": datetime.now().isoformat()
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
    return {"message": "Eryzaa Rental Server API", "status": "running"}

@app.get("/api/stats")
async def get_stats():
    """Get current system statistics"""
    return monitor.get_system_stats()

@app.get("/api/rentals")
async def get_rentals():
    """Get all rental information"""
    return list(rental_db.values())

@app.post("/api/rentals")
async def create_rental(rental_data: dict):
    """Create a new rental"""
    rental_id = f"rent_{len(rental_db) + 1:03d}"
    rental = {
        "id": rental_id,
        "client": rental_data.get("client", "unknown@example.com"),
        "duration": rental_data.get("duration", "1h"),
        "status": "pending",
        "gpu": rental_data.get("gpu", "RTX 4090"),
        "created_at": datetime.now().isoformat()
    }
    rental_db[rental_id] = rental
    
    # Broadcast update to connected clients
    await broadcast_update({"type": "rental_created", "data": rental})
    
    return rental

@app.put("/api/rentals/{rental_id}")
async def update_rental(rental_id: str, rental_data: dict):
    """Update rental status"""
    if rental_id not in rental_db:
        raise HTTPException(status_code=404, detail="Rental not found")
    
    rental_db[rental_id].update(rental_data)
    
    # Broadcast update to connected clients
    await broadcast_update({"type": "rental_updated", "data": rental_db[rental_id]})
    
    return rental_db[rental_id]

@app.delete("/api/rentals/{rental_id}")
async def delete_rental(rental_id: str):
    """Delete/complete a rental"""
    if rental_id not in rental_db:
        raise HTTPException(status_code=404, detail="Rental not found")
    
    rental = rental_db.pop(rental_id)
    
    # Broadcast update to connected clients
    await broadcast_update({"type": "rental_deleted", "data": rental})
    
    return {"message": "Rental deleted", "rental": rental}

@app.post("/api/command")
async def execute_command(command_data: dict):
    """Execute system commands safely"""
    command = command_data.get("command", "").lower().strip()
    
    if command == "status":
        return {"output": monitor.get_system_stats()}
    elif command == "restart":
        return {"output": "Restart command received - would restart services"}
    elif command == "logs":
        try:
            # Get recent Docker logs
            logs = []
            if self.docker_client:
                for container in self.docker_client.containers.list():
                    recent_logs = container.logs(tail=5).decode('utf-8')
                    logs.append(f"=== {container.name} ===")
                    logs.extend(recent_logs.split('\n')[-5:])
            else:
                logs = ["Docker not available - showing mock logs",
                       "[2024-01-15 14:30:15] Rental server started",
                       "[2024-01-15 14:32:22] API endpoints initialized",
                       "[2024-01-15 14:35:10] ZeroTier connection established"]
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
        stats = monitor.get_system_stats()
        await websocket.send_text(json.dumps({"type": "stats", "data": stats}))
        
        # Keep connection alive and handle incoming messages
        async for message in websocket.iter_text():
            try:
                data = json.loads(message)
                if data.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
                elif data.get("type") == "get_stats":
                    stats = monitor.get_system_stats()
                    await websocket.send_text(json.dumps({"type": "stats", "data": stats}))
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
            await asyncio.sleep(5)  # Update every 5 seconds
            if connected_clients:
                stats = monitor.get_system_stats()
                await broadcast_update({"type": "stats", "data": stats})
        except Exception as e:
            print(f"Periodic broadcast error: {e}")

# Initialize some mock rental data
rental_db["rent_001"] = {
    "id": "rent_001",
    "client": "user@example.com",
    "duration": "2h 30m",
    "status": "active",
    "gpu": "RTX 4090",
    "created_at": datetime.now().isoformat()
}

rental_db["rent_002"] = {
    "id": "rent_002",
    "client": "client@test.com",
    "duration": "45m",
    "status": "pending",
    "gpu": "RTX 3080",
    "created_at": datetime.now().isoformat()
}

if __name__ == "__main__":
    # Run the server
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
