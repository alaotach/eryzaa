#!/bin/bash

# ================================================
# 🚀 ERYZAA PRODUCTION DEPLOYMENT SCRIPT
# ================================================
# One-command setup for complete rental server system
# Supports: Fast testing mode & Full production mode

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Emojis for better UX
ROCKET="🚀"
CHECKMARK="✅"
WARNING="⚠️"
ERROR="❌"
INFO="ℹ️"
GEAR="⚙️"
GLOBE="🌐"
MONITOR="📊"
LOCK="🔒"

print_header() {
    echo -e "${CYAN}================================================${NC}"
    echo -e "${ROCKET} ${YELLOW}ERYZAA PRODUCTION DEPLOYMENT${NC}"
    echo -e "${CYAN}================================================${NC}"
    echo -e "Complete rental server system with:"
    echo -e "• ${CHECKMARK} Web Dashboard (React + TypeScript)"
    echo -e "• ${GEAR} CLI Management Interface"
    echo -e "• ${GLOBE} ZeroTier Network Integration"
    echo -e "• ${MONITOR} Real-time System Monitoring"
    echo -e "• ${LOCK} Docker Containerization"
    echo -e "${CYAN}================================================${NC}"
    echo ""
}

print_status() {
    echo -e "${GREEN}[${CHECKMARK}]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[${INFO}]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[${WARNING}]${NC} $1"
}

print_error() {
    echo -e "${RED}[${ERROR}]${NC} $1"
}

check_dependencies() {
    print_info "Checking system dependencies..."
    
    local deps=("docker" "docker-compose" "node" "npm" "cargo")
    local missing=()
    
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            missing+=("$dep")
        else
            print_status "$dep is installed"
        fi
    done
    
    if [ ${#missing[@]} -ne 0 ]; then
        print_error "Missing dependencies: ${missing[*]}"
        print_info "Installing missing dependencies..."
        install_dependencies "${missing[@]}"
    fi
}

install_dependencies() {
    local distro=$(detect_distro)
    print_info "Detected distribution: $distro"
    
    case $distro in
        "arch"|"manjaro"|"endeavouros")
            print_info "Installing dependencies on Arch Linux..."
            sudo pacman -Sy --noconfirm docker docker-compose nodejs npm rust
            ;;
        "ubuntu"|"debian"|"mint")
            print_info "Installing dependencies on Ubuntu/Debian..."
            sudo apt update
            sudo apt install -y docker.io docker-compose nodejs npm curl
            curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
            source ~/.cargo/env
            ;;
        "fedora"|"centos"|"rhel")
            print_info "Installing dependencies on Fedora/RHEL..."
            sudo dnf install -y docker docker-compose nodejs npm curl
            curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
            source ~/.cargo/env
            ;;
        *)
            print_warning "Unknown distribution. Please install dependencies manually:"
            echo "- Docker & Docker Compose"
            echo "- Node.js & npm"
            echo "- Rust & Cargo"
            exit 1
            ;;
    esac
    
    # Start Docker service
    sudo systemctl start docker
    sudo systemctl enable docker
    print_status "Docker service started and enabled"
}

detect_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        echo $ID
    elif [ -f /etc/arch-release ]; then
        echo "arch"
    elif [ -f /etc/debian_version ]; then
        echo "debian"
    else
        echo "unknown"
    fi
}

select_deployment_mode() {
    echo ""
    print_info "Select deployment mode:"
    echo -e "${YELLOW}1.${NC} ${ROCKET} Fast Mode (Quick testing - lightweight containers)"
    echo -e "${YELLOW}2.${NC} ${GEAR} Full Mode (Production - complete GPU support)"
    echo -e "${YELLOW}3.${NC} ${MONITOR} Development Mode (All services + hot reload)"
    echo ""
    
    while true; do
        read -p "Enter your choice (1-3): " mode
        case $mode in
            1)
                DEPLOYMENT_MODE="fast"
                print_status "Selected: Fast Mode"
                break
                ;;
            2)
                DEPLOYMENT_MODE="full"
                print_status "Selected: Full Mode"
                break
                ;;
            3)
                DEPLOYMENT_MODE="dev"
                print_status "Selected: Development Mode"
                break
                ;;
            *)
                print_warning "Invalid choice. Please enter 1, 2, or 3."
                ;;
        esac
    done
    echo ""
}

build_applications() {
    print_info "Building Eryzaa applications..."
    
    # Build Rust applications
    print_info "Building Rust applications..."
    cargo build --release
    
    # Build rental CLI
    cd rental
    cargo build --release
    cd ..
    
    # Build web interface
    cd project
    print_info "Installing web dependencies..."
    npm install
    print_info "Building web interface..."
    npm run build
    cd ..
    
    print_status "All applications built successfully"
}

setup_network() {
    print_info "Setting up ZeroTier network..."
    
    # Install ZeroTier if not present
    if ! command -v zerotier-cli &> /dev/null; then
        print_info "Installing ZeroTier..."
        curl -s https://install.zerotier.com | sudo bash
    fi
    
    # Start ZeroTier service
    sudo systemctl start zerotier-one
    sudo systemctl enable zerotier-one
    
    # Join network
    print_info "Joining ZeroTier network: 363c67c55ad2489d"
    sudo zerotier-cli join 363c67c55ad2489d
    
    # Wait for network assignment
    print_info "Waiting for IP assignment..."
    for i in {1..30}; do
        if sudo zerotier-cli listnetworks | grep -q "OK"; then
            local zt_ip=$(sudo zerotier-cli listnetworks | grep "363c67c55ad2489d" | awk '{print $9}' | cut -d'/' -f1)
            if [ "$zt_ip" != "-" ] && [[ "$zt_ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
                print_status "ZeroTier IP assigned: $zt_ip"
                echo "$zt_ip" > .zerotier_ip
                break
            fi
        fi
        sleep 2
        echo -n "."
    done
    echo ""
}

deploy_containers() {
    print_info "Deploying Docker containers..."
    
    case $DEPLOYMENT_MODE in
        "fast")
            print_info "Deploying fast containers..."
            docker-compose -f infrastructure/docker/docker-compose.fast.yml down || true
            docker-compose -f infrastructure/docker/docker-compose.fast.yml up -d
            ;;
        "full")
            print_info "Deploying full production containers..."
            docker-compose -f infrastructure/docker/docker-compose.yml down || true
            docker-compose -f infrastructure/docker/docker-compose.yml up -d --build
            ;;
        "dev")
            print_info "Deploying development containers..."
            docker-compose -f infrastructure/docker/docker-compose.dev.yml down || true
            docker-compose -f infrastructure/docker/docker-compose.dev.yml up -d
            ;;
    esac
    
    print_status "Containers deployed successfully"
}

start_services() {
    print_info "Starting Eryzaa services using service manager..."
    
    # Use the service manager to start all services independently
    ./manage_services.sh start $DEPLOYMENT_MODE
    
    print_status "All services started independently"
}

setup_monitoring() {
    print_info "Setting up system monitoring..."
    
    # Create monitoring directory
    mkdir -p monitoring logs
    
    # Create system monitor script
    cat > monitoring/system_monitor.sh << 'EOF'
#!/bin/bash
# System monitoring script for Eryzaa

LOGFILE="logs/system_monitor.log"

while true; do
    echo "$(date): System Status Check" >> $LOGFILE
    
    # Check Docker containers
    docker ps --format "table {{.Names}}\t{{.Status}}" >> $LOGFILE
    
    # Check ZeroTier
    if sudo zerotier-cli info &> /dev/null; then
        echo "ZeroTier: Running" >> $LOGFILE
        sudo zerotier-cli listnetworks >> $LOGFILE
    else
        echo "ZeroTier: Stopped" >> $LOGFILE
    fi
    
    # System resources
    echo "CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)" >> $LOGFILE
    echo "Memory: $(free -m | awk 'NR==2{printf "%.1f%%", $3*100/$2}')" >> $LOGFILE
    echo "---" >> $LOGFILE
    
    sleep 30
done
EOF
    
    chmod +x monitoring/system_monitor.sh
    
    # Start monitoring in background
    ./monitoring/system_monitor.sh &
    echo $! > monitoring.pid
    
    print_status "System monitoring started"
}

create_management_scripts() {
    print_info "Creating management scripts..."
    
    # Create start script
    cat > start_eryzaa.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting Eryzaa Rental Server..."

# Start Docker containers
case "${1:-fast}" in
    "fast")
        docker-compose -f infrastructure/docker/docker-compose.fast.yml up -d
        ;;
    "full")
        docker-compose -f infrastructure/docker/docker-compose.yml up -d
        ;;
    "dev")
        docker-compose -f infrastructure/docker/docker-compose.dev.yml up -d
        ;;
esac

# Start web interface
cd project
if [ "$1" == "dev" ]; then
    npm run dev &
else
    npm run preview &
fi
cd ..

echo "✅ Eryzaa started successfully!"
echo "📊 Web Dashboard: http://localhost:5173"
echo "🖥️  CLI Interface: ./rental/target/release/rental"
EOF

    # Create stop script
    cat > stop_eryzaa.sh << 'EOF'
#!/bin/bash
echo "🛑 Stopping Eryzaa Rental Server..."

# Stop Docker containers
docker-compose -f infrastructure/docker/docker-compose.fast.yml down 2>/dev/null || true
docker-compose -f infrastructure/docker/docker-compose.yml down 2>/dev/null || true
docker-compose -f infrastructure/docker/docker-compose.dev.yml down 2>/dev/null || true

# Stop web interface
pkill -f "npm run" 2>/dev/null || true

# Stop monitoring
if [ -f monitoring.pid ]; then
    kill $(cat monitoring.pid) 2>/dev/null || true
    rm monitoring.pid
fi

echo "✅ Eryzaa stopped successfully!"
EOF

    # Create status script
    cat > status_eryzaa.sh << 'EOF'
#!/bin/bash
echo "📊 Eryzaa System Status"
echo "======================="

echo "🐳 Docker Containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "🌐 ZeroTier Status:"
if sudo zerotier-cli info &> /dev/null; then
    sudo zerotier-cli listnetworks
else
    echo "❌ ZeroTier not running"
fi

echo ""
echo "💻 System Resources:"
echo "CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
echo "Memory: $(free -m | awk 'NR==2{printf "%.1f%%", $3*100/$2}')"

echo ""
echo "🔗 Access URLs:"
echo "📊 Web Dashboard: http://localhost:5173"
echo "🖥️  CLI Interface: ./rental/target/release/rental"

if [ -f .zerotier_ip ]; then
    zt_ip=$(cat .zerotier_ip)
    echo "🌐 ZeroTier IP: $zt_ip"
    echo "🔑 SSH Access: ssh rental@$zt_ip"
fi
EOF

    chmod +x start_eryzaa.sh stop_eryzaa.sh status_eryzaa.sh
    print_status "Management scripts created"
}

show_completion_info() {
    local zt_ip=""
    if [ -f .zerotier_ip ]; then
        zt_ip=$(cat .zerotier_ip)
    fi
    
    echo ""
    echo -e "${GREEN}================================================${NC}"
    echo -e "${ROCKET} ${YELLOW}ERYZAA DEPLOYMENT COMPLETE!${NC}"
    echo -e "${GREEN}================================================${NC}"
    echo ""
    echo -e "${CHECKMARK} ${GREEN}Services Status:${NC}"
    echo -e "  • Docker Containers: Running"
    echo -e "  • Web Dashboard: http://localhost:5173"
    echo -e "  • CLI Interface: ./rental/target/release/rental"
    echo -e "  • System Monitoring: Active"
    
    if [ -n "$zt_ip" ]; then
        echo -e "  • ZeroTier IP: $zt_ip"
        echo -e "  • SSH Access: ssh rental@$zt_ip"
    fi
    
    echo ""
    echo -e "${INFO} ${BLUE}Management Commands:${NC}"
    echo -e "  • Start:  ./start_eryzaa.sh [fast|full|dev]"
    echo -e "  • Stop:   ./stop_eryzaa.sh"
    echo -e "  • Status: ./status_eryzaa.sh"
    echo -e "  • CLI:    ./rental/target/release/rental"
    echo ""
    echo -e "${MONITOR} ${PURPLE}Access Points:${NC}"
    echo -e "  • Web Dashboard: http://localhost:5173"
    echo -e "  • API Endpoint: http://localhost:3000"
    echo -e "  • Container SSH: ssh rental@localhost -p 2222"
    
    if [ -n "$zt_ip" ]; then
        echo -e "  • Remote SSH: ssh rental@$zt_ip"
        echo -e "  • ZeroTier Network: 363c67c55ad2489d"
    fi
    
    echo ""
    echo -e "${GEAR} ${CYAN}Rental Server Ready!${NC}"
    echo -e "Share your ZeroTier IP with clients for remote access."
    echo -e "${GREEN}================================================${NC}"
}

# Main execution
main() {
    print_header
    
    # Check if running as root
    if [ "$EUID" -eq 0 ]; then
        print_error "Please don't run this script as root"
        exit 1
    fi
    
    # Create logs directory
    mkdir -p logs
    
    check_dependencies
    select_deployment_mode
    build_applications
    setup_network
    start_services
    setup_monitoring
    create_management_scripts
    
    # Wait for services to stabilize
    print_info "Waiting for services to stabilize..."
    sleep 10
    
    show_completion_info
}

# Run main function
main "$@"
