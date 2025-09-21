#!/bin/bash

# ================================================
# 🚀 ERYZAA SERVICE MANAGER
# ================================================
# Independent service management for all components

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors and emojis
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

ROCKET="🚀"
CHECKMARK="✅"
WARNING="⚠️"
ERROR="❌"
INFO="ℹ️"
GEAR="⚙️"
GLOBE="🌐"
MONITOR="📊"

# Service management
SERVICES_DIR="$SCRIPT_DIR/.services"
PID_DIR="$SERVICES_DIR/pids"
LOG_DIR="$SERVICES_DIR/logs"

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

setup_service_dirs() {
    mkdir -p "$SERVICES_DIR" "$PID_DIR" "$LOG_DIR"
    print_info "Service directories created"
}

start_service() {
    local service_name="$1"
    local command="$2"
    local working_dir="$3"
    
    local pid_file="$PID_DIR/${service_name}.pid"
    local log_file="$LOG_DIR/${service_name}.log"
    
    # Check if already running
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            print_warning "$service_name is already running (PID: $pid)"
            return 0
        else
            rm -f "$pid_file"
        fi
    fi
    
    print_info "Starting $service_name..."
    
    # Start service in background
    cd "$working_dir"
    nohup bash -c "$command" > "$log_file" 2>&1 &
    local pid=$!
    
    # Save PID
    echo "$pid" > "$pid_file"
    
    # Wait a moment to check if it started successfully
    sleep 2
    if kill -0 "$pid" 2>/dev/null; then
        print_status "$service_name started successfully (PID: $pid)"
        return 0
    else
        print_error "$service_name failed to start"
        rm -f "$pid_file"
        return 1
    fi
}

stop_service() {
    local service_name="$1"
    local pid_file="$PID_DIR/${service_name}.pid"
    
    if [ ! -f "$pid_file" ]; then
        print_warning "$service_name is not running"
        return 0
    fi
    
    local pid=$(cat "$pid_file")
    if kill -0 "$pid" 2>/dev/null; then
        print_info "Stopping $service_name (PID: $pid)..."
        kill "$pid"
        
        # Wait for graceful shutdown
        for i in {1..10}; do
            if ! kill -0 "$pid" 2>/dev/null; then
                break
            fi
            sleep 1
        done
        
        # Force kill if still running
        if kill -0 "$pid" 2>/dev/null; then
            print_warning "Force killing $service_name..."
            kill -9 "$pid" 2>/dev/null || true
        fi
        
        rm -f "$pid_file"
        print_status "$service_name stopped"
    else
        print_warning "$service_name was not running"
        rm -f "$pid_file"
    fi
}

get_service_status() {
    local service_name="$1"
    local pid_file="$PID_DIR/${service_name}.pid"
    
    if [ ! -f "$pid_file" ]; then
        echo "stopped"
        return
    fi
    
    local pid=$(cat "$pid_file")
    if kill -0 "$pid" 2>/dev/null; then
        echo "running (PID: $pid)"
    else
        echo "crashed"
        rm -f "$pid_file"
    fi
}

start_all_services() {
    print_info "${ROCKET} Starting all Eryzaa services..."
    
    # Ensure virtual environment is available
    if [ ! -d "/home/aloo/aloo" ]; then
        print_error "Python virtual environment not found at /home/aloo/aloo"
        print_info "Please run: python -m venv /home/aloo/aloo"
        return 1
    fi
    
    # 1. Start Docker containers
    print_info "Starting Docker containers..."
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
    
    # 2. Start API server
    start_service "api-server" \
        "source /home/aloo/aloo/bin/activate && python api_server.py" \
        "$SCRIPT_DIR/backend"
    
    # 3. Start web interface
    case "${1:-fast}" in
        "dev")
            start_service "web-dev" \
                "npm run dev" \
                "$SCRIPT_DIR/project"
            ;;
        *)
            start_service "web-prod" \
                "npm run preview" \
                "$SCRIPT_DIR/project"
            ;;
    esac
    
    # 4. Start system monitoring
    start_service "monitor" \
        "./monitoring/system_monitor.sh" \
        "$SCRIPT_DIR"
    
    print_status "All services started!"
}

stop_all_services() {
    print_info "Stopping all Eryzaa services..."
    
    # Stop our managed services
    stop_service "api-server"
    stop_service "web-dev"
    stop_service "web-prod"
    stop_service "monitor"
    
    # Stop Docker containers
    print_info "Stopping Docker containers..."
    docker-compose -f infrastructure/docker/docker-compose.fast.yml down 2>/dev/null || true
    docker-compose -f infrastructure/docker/docker-compose.yml down 2>/dev/null || true
    docker-compose -f infrastructure/docker/docker-compose.dev.yml down 2>/dev/null || true
    
    print_status "All services stopped!"
}

show_status() {
    echo -e "${CYAN}================================================${NC}"
    echo -e "${MONITOR} ${YELLOW}ERYZAA SERVICES STATUS${NC}"
    echo -e "${CYAN}================================================${NC}"
    
    echo -e "\n${BLUE}Managed Services:${NC}"
    echo -e "  • API Server:    $(get_service_status 'api-server')"
    echo -e "  • Web Dev:       $(get_service_status 'web-dev')"
    echo -e "  • Web Prod:      $(get_service_status 'web-prod')"
    echo -e "  • Monitor:       $(get_service_status 'monitor')"
    
    echo -e "\n${BLUE}Docker Containers:${NC}"
    docker ps --format "  • {{.Names}}: {{.Status}}" 2>/dev/null || echo "  Docker not available"
    
    echo -e "\n${BLUE}ZeroTier Network:${NC}"
    if sudo zerotier-cli info &> /dev/null; then
        local zt_status=$(sudo zerotier-cli listnetworks 2>/dev/null | grep "363c67c55ad2489d" || echo "Not connected")
        if [[ "$zt_status" == *"OK"* ]]; then
            local zt_ip=$(echo "$zt_status" | awk '{print $NF}' | cut -d'/' -f1)
            echo -e "  • Status: ${GREEN}Connected${NC}"
            echo -e "  • IP: $zt_ip"
        else
            echo -e "  • Status: ${YELLOW}Connecting...${NC}"
        fi
    else
        echo -e "  • Status: ${RED}Not available${NC}"
    fi
    
    echo -e "\n${BLUE}Access URLs:${NC}"
    if [ "$(get_service_status 'web-dev')" != "stopped" ]; then
        echo -e "  • Web Dashboard: http://localhost:5173 (dev)"
    fi
    if [ "$(get_service_status 'web-prod')" != "stopped" ]; then
        echo -e "  • Web Dashboard: http://localhost:4173 (prod)"
    fi
    echo -e "  • API Server: http://localhost:8000"
    echo -e "  • CLI: ./rental/target/release/rental"
    
    if [ -f .zerotier_ip ]; then
        local zt_ip=$(cat .zerotier_ip)
        echo -e "  • Remote SSH: ssh rental@$zt_ip"
    fi
    
    echo -e "${CYAN}================================================${NC}"
}

restart_service() {
    local service_name="$1"
    print_info "Restarting $service_name..."
    stop_service "$service_name"
    sleep 1
    
    case "$service_name" in
        "api-server")
            start_service "api-server" \
                "source /home/aloo/aloo/bin/activate && python api_server.py" \
                "$SCRIPT_DIR/backend"
            ;;
        "web-dev")
            start_service "web-dev" \
                "npm run dev" \
                "$SCRIPT_DIR/project"
            ;;
        "web-prod")
            start_service "web-prod" \
                "npm run preview" \
                "$SCRIPT_DIR/project"
            ;;
        "monitor")
            start_service "monitor" \
                "./monitoring/system_monitor.sh" \
                "$SCRIPT_DIR"
            ;;
        *)
            print_error "Unknown service: $service_name"
            return 1
            ;;
    esac
}

show_logs() {
    local service_name="$1"
    local log_file="$LOG_DIR/${service_name}.log"
    
    if [ ! -f "$log_file" ]; then
        print_error "No logs found for $service_name"
        return 1
    fi
    
    echo -e "${CYAN}=== Logs for $service_name ===${NC}"
    tail -n 50 "$log_file"
}

# Main command handling
case "${1:-help}" in
    "start")
        setup_service_dirs
        start_all_services "${2:-fast}"
        ;;
    "stop")
        stop_all_services
        ;;
    "restart")
        if [ -n "$2" ]; then
            restart_service "$2"
        else
            stop_all_services
            sleep 2
            start_all_services "${3:-fast}"
        fi
        ;;
    "status")
        show_status
        ;;
    "logs")
        if [ -n "$2" ]; then
            show_logs "$2"
        else
            print_info "Available logs:"
            for log in "$LOG_DIR"/*.log; do
                if [ -f "$log" ]; then
                    local service=$(basename "$log" .log)
                    echo "  • $service"
                fi
            done
            print_info "Usage: $0 logs <service-name>"
        fi
        ;;
    "help"|*)
        echo -e "${CYAN}================================================${NC}"
        echo -e "${ROCKET} ${YELLOW}ERYZAA SERVICE MANAGER${NC}"
        echo -e "${CYAN}================================================${NC}"
        echo ""
        echo -e "${BLUE}Commands:${NC}"
        echo -e "  • start [mode]     - Start all services (mode: fast/full/dev)"
        echo -e "  • stop             - Stop all services"
        echo -e "  • restart [svc]    - Restart all services or specific service"
        echo -e "  • status           - Show service status"
        echo -e "  • logs [service]   - Show service logs"
        echo ""
        echo -e "${BLUE}Services:${NC}"
        echo -e "  • api-server       - FastAPI backend"
        echo -e "  • web-dev          - Development web server"
        echo -e "  • web-prod         - Production web server"
        echo -e "  • monitor          - System monitoring"
        echo ""
        echo -e "${BLUE}Examples:${NC}"
        echo -e "  • $0 start fast    - Quick deployment"
        echo -e "  • $0 restart api-server - Restart API only"
        echo -e "  • $0 logs web-prod - Show web server logs"
        echo -e "${CYAN}================================================${NC}"
        ;;
esac
