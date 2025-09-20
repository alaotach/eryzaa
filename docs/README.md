# Docker-based Rental Server

A secure, containerized rental server solution using Docker, Ubuntu, ZeroTier, and SSH with GPU support.

## Features

- 🐳 **Docker-based**: Isolated, portable, and easy to deploy
- 🔒 **Private Network**: Uses ZeroTier for secure peer-to-peer networking
- 🖥️ **GPU Support**: NVIDIA GPU access for co# Check GPU: `docker run --rm --gpus all nvidia/cuda:13.0.1-cudnn-devel-ubuntu24.04 nvidia-smi`pute workloads
- 🔐 **SSH Access**: Secure shell access with user isolation
- 🛡️ **Security**: Container isolation and controlled access
- 📊 **Monitoring**: Built-in health checks and service monitoring

## Prerequisites

### Required Software
- Docker (20.10+)
- Docker Compose (2.0+)
- NVIDIA Docker (for GPU support) - Optional

### Installation Commands

#### Ubuntu/Debian
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install NVIDIA Docker (if you have NVIDIA GPU)
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list
sudo apt-get update && sudo apt-get install -y nvidia-docker2
sudo systemctl restart docker
```

#### Arch Linux
```bash
# Install Docker
sudo pacman -S docker docker-compose
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER

# Install NVIDIA Docker (if you have NVIDIA GPU)
yay -S nvidia-docker
sudo systemctl restart docker
```

## Quick Start

### Option 1: Using the Management Script (Recommended)
```bash
# Deploy the server
./manage.sh deploy

# Check status and get ZeroTier IP
./manage.sh status

# Connect via SSH
./manage.sh connect

# View logs
./manage.sh logs

# Stop the server
./manage.sh stop
```

### Option 2: Using the Rust Client
```bash
cd client
cargo run
```

### Option 3: Manual Docker Commands
```bash
# Deploy
docker-compose up -d --build

# Check logs
docker-compose logs -f rental-server

# Get ZeroTier IP
docker exec rental-server zerotier-cli listnetworks

# Connect via SSH
ssh rental@<zerotier_ip>
```

## Configuration

### Environment Variables (.env)
```bash
ZEROTIER_NETWORK_ID=363c67c55ad2489d
SSH_ROOT_PASSWORD=rental_access_2024
SSH_USER_PASSWORD=rental_user_2024
CONTAINER_NAME=rental-server
SSH_PORT=2222
GPU_ACCESS=all
```

### Network Configuration
- ZeroTier Network ID: `363c67c55ad2489d`
- SSH Port (local): `2222` → Container: `22`
- Web UI (Portainer): `http://localhost:9000`

## Access Methods

### SSH Access
```bash
# Regular user
ssh rental@<zerotier_ip>
# Password: rental_user_2024

# Root user
ssh root@<zerotier_ip>
# Password: rental_access_2024

# Local access (if port forwarding is enabled)
ssh -p 2222 rental@localhost
```

### ZeroTier Network
1. Join the ZeroTier network `363c67c55ad2489d`
2. Get authorized in the network (contact network admin)
3. Get the assigned IP from the container
4. Connect using SSH

## Security Features

### Container Isolation
- Runs in isolated Docker container
- Limited host access
- Controlled resource allocation

### Network Security
- ZeroTier encrypted P2P network
- No open ports to the internet
- Private network communication only

### User Security
- Separate user accounts (rental/root)
- SSH key authentication supported
- Password authentication available

### Data Security
- Persistent volumes for data
- Encrypted network communication
- Container-level isolation

## GPU Support

### Requirements
- NVIDIA GPU
- NVIDIA drivers installed on host
- NVIDIA Docker toolkit

### Verification
```bash
# Check GPU access inside container
docker exec rental-server nvidia-smi

# Run GPU test
docker exec rental-server python3 -c "import torch; print(torch.cuda.is_available())"
```

## Directory Structure

```
├── Dockerfile              # Container definition
├── docker-compose.yml      # Service orchestration
├── docker-entrypoint.sh    # Container startup script
├── manage.sh               # Management script
├── .env                    # Environment configuration
├── client/                 # Rust client application
│   ├── src/main.rs
│   └── Cargo.toml
├── rental/                 # Rust server application
│   ├── src/main.rs
│   └── Cargo.toml
└── workspace/              # Persistent data
    ├── data/               # Application data
    └── shared/             # Shared files
```

## Container Services

### Running Services
- ZeroTier One daemon
- SSH server (sshd)
- Rental application (monitoring)

### Installed Software
- Ubuntu 24.04 LTS
- NVIDIA CUDA 13.0.1 with cuDNN
- Python 3.12 + pip
- Node.js + npm
- Rust + Cargo
- Git, vim, nano, htop
- Development tools

## Troubleshooting

### Container Won't Start
```bash
# Check Docker status
docker info

# Check logs
docker-compose logs rental-server

# Rebuild container
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### ZeroTier Issues
```bash
# Check ZeroTier status
docker exec rental-server zerotier-cli info

# Rejoin network
docker exec rental-server zerotier-cli leave 363c67c55ad2489d
docker exec rental-server zerotier-cli join 363c67c55ad2489d

# Check network status
docker exec rental-server zerotier-cli listnetworks
```

### SSH Connection Issues
```bash
# Check SSH service
docker exec rental-server service ssh status

# Restart SSH
docker exec rental-server service ssh restart

# Test local connection
ssh -p 2222 -o StrictHostKeyChecking=no rental@localhost
```

### GPU Access Issues
```bash
# Check NVIDIA Docker
docker run --rm --gpus all nvidia/cuda:13.0.1-cudnn-devel-ubuntu24.04 nvidia-smi

# Check container GPU access
docker exec rental-server nvidia-smi

# Verify CUDA
docker exec rental-server nvcc --version
```

## Management Commands

### Container Management
```bash
./manage.sh deploy      # Deploy the server
./manage.sh status       # Show status
./manage.sh connect      # Connect via SSH
./manage.sh logs         # View logs
./manage.sh restart      # Restart container
./manage.sh stop         # Stop container
./manage.sh clean        # Remove everything
```

### Docker Commands
```bash
# View running containers
docker ps

# Execute commands in container
docker exec -it rental-server bash

# Copy files to/from container
docker cp file.txt rental-server:/workspace/
docker cp rental-server:/workspace/file.txt ./

# Monitor resource usage
docker stats rental-server
```

## Network Information

### ZeroTier Network: 363c67c55ad2489d
- **Type**: Private network
- **Authorization**: Required
- **Encryption**: AES-256
- **Protocol**: UDP (for NAT traversal)

### Port Configuration
- Container SSH: 22
- Host SSH: 2222 (optional local access)
- Portainer: 9000 (container management)

## Development

### Building from Source
```bash
# Build client
cd client
cargo build --release

# Build rental (done in container)
cd rental
cargo build --release
```

### Customizing the Container
1. Modify `Dockerfile` for system changes
2. Update `docker-entrypoint.sh` for startup logic
3. Edit `docker-compose.yml` for service configuration
4. Rebuild: `docker-compose build --no-cache`

## Support

### Common Issues
- **Container fails to start**: Check Docker and GPU support
- **Can't get ZeroTier IP**: Wait for network authorization
- **SSH connection refused**: Check ZeroTier connectivity
- **GPU not accessible**: Verify NVIDIA Docker installation

### Getting Help
1. Check the logs: `./manage.sh logs`
2. Verify Docker: `docker info`
3. Test ZeroTier: `./manage.sh status`
4. Check GPU: `docker run --rm --gpus all nvidia/cuda:12.2-base nvidia-smi`

---

**Security Note**: This setup provides secure, isolated access through ZeroTier networking. Ensure your ZeroTier network is properly configured and authorized devices are trusted.
