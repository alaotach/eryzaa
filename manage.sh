#!/bin/bash

# Rental Server Management Script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[+]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[-]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[*]${NC} $1"
}

# Detect Linux distribution
detect_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        echo "$ID"
    elif [ -f /etc/arch-release ]; then
        echo "arch"
    elif [ -f /etc/debian_version ]; then
        echo "debian"
    elif [ -f /etc/fedora-release ]; then
        echo "fedora"
    else
        echo "unknown"
    fi
}

# Install Docker based on distribution
install_docker() {
    print_info "Installing Docker..."
    local distro
    distro=$(detect_distro)
    
    case "$distro" in
        "ubuntu"|"debian"|"mint"|"kali")
            print_info "Installing Docker on $distro..."
            
            # Update package index
            sudo apt-get update
            
            # Install prerequisites
            sudo apt-get install -y \
                apt-transport-https \
                ca-certificates \
                curl \
                gnupg \
                lsb-release
            
            # Add Docker's official GPG key
            sudo mkdir -p /etc/apt/keyrings
            curl -fsSL https://download.docker.com/linux/$distro/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
            
            # Set up the repository
            echo \
                "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$distro \
                $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
            
            # Install Docker Engine
            sudo apt-get update
            sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin
            ;;
            
        "arch"|"manjaro"|"endeavouros")
            print_info "Installing Docker on Arch Linux..."
            sudo pacman -Sy --noconfirm docker docker-compose
            ;;
            
        "fedora"|"centos"|"rhel")
            print_info "Installing Docker on $distro..."
            sudo dnf install -y dnf-plugins-core
            sudo dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo
            sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin
            ;;
            
        *)
            print_info "Unknown distribution. Trying universal installation method..."
            curl -fsSL https://get.docker.com -o get-docker.sh
            sudo sh get-docker.sh
            rm get-docker.sh
            ;;
    esac
    
    # Start and enable Docker service
    sudo systemctl start docker
    sudo systemctl enable docker
    
    # Add current user to docker group
    sudo usermod -aG docker "$USER"
    
    print_status "Docker installed successfully!"
    print_warning "You may need to log out and log back in for group changes to take effect."
    
    # Try to use newgrp to activate group membership
    print_info "Attempting to activate docker group membership..."
    newgrp docker << EOF
echo "Docker group activated"
EOF

    # Verify installation
    if command -v docker &> /dev/null; then
        return 0
    else
        return 1
    fi
}

# Install Docker Compose
install_docker_compose() {
    print_info "Installing Docker Compose..."
    local distro
    distro=$(detect_distro)
    
    case "$distro" in
        "arch"|"manjaro"|"endeavouros")
            # Check if docker-compose is available, if not install it
            if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null 2>&1; then
                print_info "Installing docker-compose via pacman..."
                sudo pacman -Sy --noconfirm docker-compose
            fi
            print_status "Docker Compose is available"
            ;;
        *)
            # Install latest docker-compose
            local compose_version
            compose_version=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
            
            sudo curl -L "https://github.com/docker/compose/releases/download/${compose_version}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
            sudo chmod +x /usr/local/bin/docker-compose
            
            # Create symlink for easier access
            sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
            ;;
    esac
    
    # Verify installation
    if command -v docker-compose &> /dev/null || docker compose version &> /dev/null 2>&1; then
        print_status "Docker Compose installed successfully!"
    else
        print_error "Docker Compose installation failed."
        return 1
    fi
}

# Install NVIDIA Docker (optional)
install_nvidia_docker() {
    print_info "Installing NVIDIA Docker support..."
    local distro
    distro=$(detect_distro)
    
    # Check if NVIDIA GPU is present
    if ! lspci | grep -i nvidia &> /dev/null; then
        print_warning "No NVIDIA GPU detected. Skipping NVIDIA Docker installation."
        return 0
    fi
    
    case "$distro" in
        "ubuntu"|"debian")
            distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
            curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
            curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list
            sudo apt-get update
            sudo apt-get install -y nvidia-docker2
            sudo systemctl restart docker
            ;;
        "arch"|"manjaro"|"endeavouros")
            # Install from AUR
            if command -v yay &> /dev/null; then
                yay -S --noconfirm nvidia-docker
            elif command -v paru &> /dev/null; then
                paru -S --noconfirm nvidia-docker
            else
                print_warning "No AUR helper found. Please install nvidia-docker manually."
                return 1
            fi
            sudo systemctl restart docker
            ;;
        "fedora")
            sudo dnf config-manager --add-repo https://nvidia.github.io/nvidia-docker/fedora/nvidia-docker.repo
            sudo dnf install -y nvidia-docker2
            sudo systemctl restart docker
            ;;
        *)
            print_warning "NVIDIA Docker installation not supported for $distro"
            return 1
            ;;
    esac
    
    print_status "NVIDIA Docker installed successfully!"
}

# Check if Docker is installed and running, install if missing
check_docker() {
    local need_install=false
    local need_compose=false
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_warning "Docker is not installed."
        need_install=true
    elif ! docker info &> /dev/null; then
        print_warning "Docker is not running or current user lacks permissions."
        # Try to start docker service
        if command -v systemctl &> /dev/null; then
            print_info "Attempting to start Docker service..."
            sudo systemctl start docker || true
            sudo systemctl enable docker || true
            sleep 3
            
            if ! docker info &> /dev/null; then
                print_warning "Docker service issue detected. Will attempt to fix."
                need_install=true
            fi
        else
            need_install=true
        fi
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        if ! docker compose version &> /dev/null 2>&1; then
            print_warning "Docker Compose is not installed."
            need_compose=true
        fi
    fi
    
    # Install Docker if needed
    if [ "$need_install" = true ]; then
        if ! install_docker; then
            print_error "Docker installation failed."
            exit 1
        fi
    fi
    
    # Install Docker Compose if needed
    if [ "$need_compose" = true ]; then
        if ! install_docker_compose; then
            print_error "Docker Compose installation failed."
            exit 1
        fi
    fi
    
    # Final verification
    if ! docker info &> /dev/null; then
        print_error "Docker installation failed or current user needs to be added to docker group."
        print_info "Please run: sudo usermod -aG docker \$USER && newgrp docker"
        print_info "Or log out and log back in."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null 2>&1; then
        print_error "Docker Compose installation failed."
        exit 1
    fi
}

# Deploy the rental server
deploy() {
    print_info "Deploying rental server..."
    check_docker
    
    # Ask about NVIDIA Docker installation
    if lspci | grep -i nvidia &> /dev/null; then
        print_info "NVIDIA GPU detected!"
        print_warning "Do you want to install NVIDIA Docker support for GPU access? (y/N)"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            install_nvidia_docker
        else
            print_info "Skipping NVIDIA Docker installation."
        fi
    fi
    
    # Create workspace directory
    mkdir -p workspace/data workspace/shared
    
    # Stop existing container
    docker-compose down 2>/dev/null || true
    
    # Build and start
    print_info "Building Docker image..."
    docker-compose build
    
    print_info "Starting container..."
    docker-compose up -d
    
    print_status "Rental server deployed successfully!"
    print_info "Waiting for services to start..."
    sleep 10
    
    # Show status
    status
}

# Deploy in development mode
deploy_dev() {
    print_info "Deploying rental server in DEVELOPMENT mode..."
    check_docker
    
    # Create workspace directory
    mkdir -p workspace/data workspace/shared
    
    # Stop existing containers
    docker-compose -f docker-compose.dev.yml down 2>/dev/null || true
    docker-compose down 2>/dev/null || true
    
    # Build and start development container
    print_info "Building development Docker image..."
    docker-compose -f docker-compose.dev.yml build
    
    print_info "Starting development container..."
    docker-compose -f docker-compose.dev.yml up -d
    
    print_status "Development rental server deployed successfully!"
    print_info "🔄 Live code reloading is enabled!"
    print_info "📁 Edit files in rental/src and client/src - they will auto-rebuild"
    print_info "Waiting for services to start..."
    sleep 10
    
    # Show status
    status_dev
}

# Show development container status
status_dev() {
    print_info "Development Container Status:"
    docker-compose -f docker-compose.dev.yml ps
    
    print_info "Getting ZeroTier IP..."
    local zt_ip
    zt_ip=$(get_zerotier_ip_dev)
    
    if [ -n "$zt_ip" ]; then
        print_status "ZeroTier IP: $zt_ip"
        print_info "SSH Access:"
        echo "  ssh rental@$zt_ip"
        echo "  ssh root@$zt_ip"
        print_info "Development Access:"
        echo "  docker exec -it rental-server-dev bash"
        echo "  docker exec -it rental-server-dev su - rental"
    else
        print_warning "ZeroTier IP not available yet. Please wait a moment and try again."
    fi
}

# Get ZeroTier IP from development container
get_zerotier_ip_dev() {
    for i in {1..30}; do
        local ip
        ip=$(docker exec rental-server-dev zerotier-cli listnetworks 2>/dev/null | grep "363c67c55ad2489d" | awk '{print $9}' | head -1 2>/dev/null || echo "")
        
        if [ -n "$ip" ] && [ "$ip" != "-" ]; then
            echo "$ip" | cut -d'/' -f1
            return 0
        fi
        
        sleep 2
    done
    
    return 1
}

# Deploy fast development server (minimal setup)
deploy_fast() {
    print_info "Deploying fast development server..."
    check_docker
    
    # Create workspace directory
    mkdir -p workspace/data
    
    # Stop existing containers
    docker-compose -f docker-compose.fast.yml down 2>/dev/null || true
    docker-compose -f docker-compose.dev.yml down 2>/dev/null || true
    docker-compose down 2>/dev/null || true
    
    # Build and start minimal container
    print_info "Building minimal development image..."
    docker-compose -f docker-compose.fast.yml up -d --build
    
    print_status "Fast development server deployed!"
    print_info "Waiting for services to start..."
    sleep 5
    
    # Show status
    status_fast
}

# Show fast development status
status_fast() {
    print_info "Fast Development Status:"
    docker-compose -f docker-compose.fast.yml ps
    
    print_info "Getting ZeroTier IP..."
    local zt_ip
    zt_ip=$(get_zerotier_ip_fast)
    
    if [ -n "$zt_ip" ]; then
        print_status "ZeroTier IP: $zt_ip"
        print_info "SSH Access:"
        echo "  ssh rental@$zt_ip"
        echo "  ssh root@$zt_ip"
        print_info "Local SSH Access:"
        echo "  ssh -p 2222 rental@localhost"
    else
        print_warning "ZeroTier IP not available yet. Container starting..."
    fi
}

# Get ZeroTier IP from fast container
get_zerotier_ip_fast() {
    for i in {1..20}; do
        local ip
        ip=$(docker exec rental-dev zerotier-cli listnetworks 2>/dev/null | grep "363c67c55ad2489d" | awk '{print $9}' | head -1 2>/dev/null || echo "")
        
        if [ -n "$ip" ] && [ "$ip" != "-" ]; then
            echo "$ip" | cut -d'/' -f1
            return 0
        fi
        
        sleep 1
    done
    
    return 1
}

# Show container status
status() {
    print_info "Container Status:"
    docker-compose ps
    
    print_info "Getting ZeroTier IP..."
    local zt_ip
    zt_ip=$(get_zerotier_ip)
    
    if [ -n "$zt_ip" ]; then
        print_status "ZeroTier IP: $zt_ip"
        print_info "SSH Access:"
        echo "  ssh rental@$zt_ip"
        echo "  ssh root@$zt_ip"
    else
        print_warning "ZeroTier IP not available yet. Please wait a moment and try again."
    fi
}

# Get ZeroTier IP
get_zerotier_ip() {
    for i in {1..30}; do
        local ip
        ip=$(docker exec rental-server zerotier-cli listnetworks 2>/dev/null | grep "363c67c55ad2489d" | awk '{print $9}' | head -1 2>/dev/null || echo "")
        
        if [ -n "$ip" ] && [ "$ip" != "-" ]; then
            echo "$ip" | cut -d'/' -f1
            return 0
        fi
        
        sleep 2
    done
    
    return 1
}

# Connect to the server
connect() {
    local zt_ip
    zt_ip=$(get_zerotier_ip)
    
    if [ -n "$zt_ip" ]; then
        print_info "Connecting to rental server at $zt_ip..."
        ssh -o StrictHostKeyChecking=no rental@"$zt_ip"
    else
        print_error "Could not get ZeroTier IP. Make sure the container is running and has joined the network."
        exit 1
    fi
}

# Show logs
logs() {
    print_info "Container logs:"
    docker-compose logs -f rental-server
}

# Stop the server
stop() {
    print_info "Stopping rental server..."
    docker-compose down
    print_status "Rental server stopped."
}

# Restart the server
restart() {
    print_info "Restarting rental server..."
    docker-compose restart
    print_status "Rental server restarted."
    sleep 5
    status
}

# Clean up everything
clean() {
    print_warning "This will remove all containers, images, and volumes. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        print_info "Cleaning up..."
        docker-compose down -v
        docker system prune -f
        docker volume prune -f
        print_status "Cleanup completed."
    else
        print_info "Cleanup cancelled."
    fi
}

# Install Docker and dependencies
install() {
    print_info "Installing Docker and dependencies..."
    
    # Check if already installed
    if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
        print_status "Docker and Docker Compose are already installed!"
        if docker info &> /dev/null; then
            print_status "Docker is running properly!"
            return 0
        fi
    fi
    
    # Install Docker
    if ! command -v docker &> /dev/null; then
        install_docker
    fi
    
    # Install Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null 2>&1; then
        install_docker_compose
    fi
    
    # Ask about NVIDIA Docker
    if lspci | grep -i nvidia &> /dev/null; then
        print_info "NVIDIA GPU detected!"
        print_warning "Do you want to install NVIDIA Docker support? (y/N)"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            install_nvidia_docker
        fi
    fi
    
    print_status "Installation completed!"
    print_info "Testing Docker installation..."
    
    if docker info &> /dev/null; then
        print_status "Docker is working correctly!"
    else
        print_warning "Docker may need additional setup. Try:"
        print_info "  sudo usermod -aG docker \$USER"
        print_info "  newgrp docker"
        print_info "  or log out and log back in"
    fi
}

# Show help
show_help() {
    echo "Rental Server Management Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  deploy     Deploy the rental server (production)"
    echo "  dev        Deploy in development mode (live code reloading)"
    echo "  fast       Deploy minimal development server (fastest startup)"
    echo "  status     Show container and network status"
    echo "  connect    Connect to the server via SSH"
    echo "  logs       Show container logs"
    echo "  stop       Stop the rental server"
    echo "  restart    Restart the rental server"
    echo "  clean      Remove all containers and data"
    echo "  install    Install Docker and dependencies"
    echo "  help       Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 install     # Install Docker and dependencies"
    echo "  $0 deploy      # Deploy the server"
    echo "  $0 status      # Check status"
    echo "  $0 connect     # Connect via SSH"
    echo "  $0 logs        # View logs"
}

# Main script logic
case "${1:-help}" in
    install)
        install
        ;;
    deploy)
        deploy
        ;;
    dev)
        deploy_dev
        ;;
    fast)
        deploy_fast
        ;;
    status)
        if docker ps | grep -q "rental-dev"; then
            status_fast
        elif docker ps | grep -q "rental-server-dev"; then
            status_dev
        else
            status
        fi
        ;;
    connect)
        connect
        ;;
    logs)
        if docker ps | grep -q "rental-server-dev"; then
            print_info "Development container logs:"
            docker-compose -f docker-compose.dev.yml logs -f rental-server-dev
        else
            logs
        fi
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    clean)
        clean
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
