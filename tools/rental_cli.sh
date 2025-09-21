#!/bin/bash

# Eryzaa CLI Rental Server
# Simple command-line interface for renting out your PC via SSH

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SSH_SERVICE_SCRIPT="$SC        echo -e "${YELLOW}💡 Run: node $SCRIPT_DIR/blockchain_integration.cjs register${NC}"IPT_DIR/../tools/ssh_service.sh"
RENTAL_STATE_FILE="/tmp/eryzaa_rental_state"
LOG_FILE="/var/log/eryzaa_rental.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

print_banner() {
    echo -e "${BLUE}"
    echo "=================================="
    echo "🚀 ERYZAA CLI RENTAL SERVER"
    echo "=================================="
    echo -e "${NC}"
}

check_ssh_service() {
    if [ ! -p "/tmp/eryzaa_ssh_service.sock" ]; then
        echo -e "${RED}❌ SSH management service not running!${NC}"
        echo -e "${YELLOW}Start it with: sudo $SSH_SERVICE_SCRIPT daemon${NC}"
        return 1
    fi
    return 0
}

get_rental_status() {
    if [ -f "$RENTAL_STATE_FILE" ]; then
        cat "$RENTAL_STATE_FILE"
    else
        echo "stopped"
    fi
}

set_rental_status() {
    echo "$1" > "$RENTAL_STATE_FILE"
}

get_system_ip() {
    # Get primary IP address
    ip route get 8.8.8.8 | grep -oP 'src \K\S+' 2>/dev/null || echo "unknown"
}

get_zerotier_ip() {
    # Try to get ZeroTier IP if available
    zerotier-cli listnetworks 2>/dev/null | grep -E "363c67c55ad2489d|OK" | awk '{print $9}' | cut -d'/' -f1 2>/dev/null || echo "not_configured"
}

list_active_users() {
    echo "list" > /tmp/eryzaa_ssh_service.sock 2>/dev/null
    sleep 0.2
    if [ -f "/tmp/eryzaa_ssh_service.sock.response" ]; then
        cat "/tmp/eryzaa_ssh_service.sock.response" 2>/dev/null
        rm -f "/tmp/eryzaa_ssh_service.sock.response" 2>/dev/null
    fi
}

create_test_user() {
    local username="eryzaa_job_$(openssl rand -hex 4)"
    local password="$(openssl rand -base64 12)"
    
    echo "create $username $password" > /tmp/eryzaa_ssh_service.sock
    sleep 0.5
    
    if [ -f "/tmp/eryzaa_ssh_service.sock.response" ]; then
        local response=$(cat "/tmp/eryzaa_ssh_service.sock.response")
        rm -f "/tmp/eryzaa_ssh_service.sock.response" 2>/dev/null
        
        if [ "$response" = "SUCCESS" ]; then
            echo -e "${GREEN}✅ Created SSH user: $username${NC}"
            echo -e "${BLUE}🔐 SSH Command: ssh $username@$(get_system_ip)${NC}"
            echo -e "${YELLOW}🔑 Password: $password${NC}"
            echo -e "${RED}⚠️  Only ONE user can access at a time!${NC}"
            
            # Log the user creation
            log_message "Created SSH user: $username for IP: $(get_system_ip)"
            
            return 0
        else
            echo -e "${RED}❌ Failed to create user: $response${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ No response from SSH service${NC}"
        return 1
    fi
}

remove_user() {
    local username="$1"
    
    if [ -z "$username" ]; then
        echo -e "${RED}❌ Username required${NC}"
        return 1
    fi
    
    echo "remove $username" > /tmp/eryzaa_ssh_service.sock
    sleep 0.5
    
    if [ -f "/tmp/eryzaa_ssh_service.sock.response" ]; then
        local response=$(cat "/tmp/eryzaa_ssh_service.sock.response")
        rm -f "/tmp/eryzaa_ssh_service.sock.response" 2>/dev/null
        
        if [ "$response" = "SUCCESS" ]; then
            echo -e "${GREEN}✅ Removed SSH user: $username${NC}"
            log_message "Removed SSH user: $username"
            return 0
        else
            echo -e "${RED}❌ Failed to remove user: $response${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ No response from SSH service${NC}"
        return 1
    fi
}

show_status() {
    local status=$(get_rental_status)
    local system_ip=$(get_system_ip)
    local zerotier_ip=$(get_zerotier_ip)
    
    echo -e "${BLUE}📊 RENTAL SERVER STATUS${NC}"
    echo "=========================="
    
    if [ "$status" = "active" ]; then
        echo -e "Status: ${GREEN}🟢 RENTING ACTIVE${NC}"
        echo -e "Your PC is ${GREEN}available for SSH rental${NC}"
    else
        echo -e "Status: ${RED}🔴 RENTING STOPPED${NC}"
        echo -e "Your PC is ${RED}not available for rental${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}🌐 Network Information:${NC}"
    echo "  System IP: $system_ip"
    if [ "$zerotier_ip" != "not_configured" ]; then
        echo "  ZeroTier IP: $zerotier_ip"
    else
        echo "  ZeroTier: Not configured"
    fi
    
    echo ""
    echo -e "${BLUE}🔐 Active SSH Users:${NC}"
    local users=$(list_active_users)
    if [ -n "$users" ] && [ "$users" != "ERROR: Unknown action" ]; then
        echo "$users" | while read -r user; do
            if [ -n "$user" ]; then
                echo "  → $user"
            fi
        done
    else
        echo "  None"
    fi
    
    echo ""
    echo -e "${BLUE}🔧 SSH Service:${NC}"
    if check_ssh_service; then
        echo -e "  ${GREEN}✅ SSH management service running${NC}"
    else
        echo -e "  ${RED}❌ SSH management service not running${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}⛓️ Blockchain Status:${NC}"
    if [ -f "/tmp/eryzaa_node_state.json" ]; then
        echo -e "  ${GREEN}✅ Node registered with blockchain${NC}"
        if command -v node >/dev/null 2>&1; then
            echo -e "  ${BLUE}📊 Getting blockchain status...${NC}"
            timeout 10 node "$SCRIPT_DIR/blockchain_integration.cjs" status 2>/dev/null | grep -E "Node ID|Available|Total Jobs" | while read -r line; do
                echo "  $line"
            done
        fi
    else
        echo -e "  ${RED}❌ Node not registered with blockchain${NC}"
        echo -e "  ${YELLOW}💡 Run: node $SCRIPT_DIR/blockchain_integration.js register${NC}"
    fi
}

start_rental() {
    if ! check_ssh_service; then
        return 1
    fi
    
    echo -e "${BLUE}🚀 Starting rental service...${NC}"
    
    # Register with blockchain if not already registered
    echo -e "${BLUE}🔗 Checking blockchain registration...${NC}"
    if [ -f "/tmp/eryzaa_node_state.json" ]; then
        echo -e "${GREEN}✅ Node already registered with blockchain${NC}"
        # Update availability on blockchain
        echo -e "${BLUE}📡 Setting node as available on blockchain...${NC}"
        if node "$SCRIPT_DIR/blockchain_integration.cjs" start >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Node marked as available on blockchain${NC}"
        else
            echo -e "${YELLOW}⚠️  Could not update blockchain status (continuing anyway)${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Node not registered with blockchain${NC}"
        echo -e "${BLUE}To register: node $SCRIPT_DIR/blockchain_integration.js register${NC}"
    fi
    
    set_rental_status "active"
    
    log_message "Rental service started - PC available for SSH access"
    echo -e "${GREEN}✅ Rental service started!${NC}"
    echo -e "${GREEN}Your PC is now available for SSH rental${NC}"
    echo ""
    echo -e "${YELLOW}💡 To create a test user: $0 test${NC}"
    echo -e "${YELLOW}💡 To check status: $0 status${NC}"
}

stop_rental() {
    echo -e "${BLUE}🛑 Stopping rental service...${NC}"
    
    # Update blockchain availability
    echo -e "${BLUE}📡 Setting node as unavailable on blockchain...${NC}"
    if node "$SCRIPT_DIR/blockchain_integration.cjs" stop >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Node marked as unavailable on blockchain${NC}"
    else
        echo -e "${YELLOW}⚠️  Could not update blockchain status${NC}"
    fi
    
    set_rental_status "stopped"
    
    # Remove all active users
    local users=$(list_active_users)
    if [ -n "$users" ] && [ "$users" != "ERROR: Unknown action" ]; then
        echo "$users" | while read -r user; do
            if [ -n "$user" ] && [[ "$user" == eryzaa_job_* ]]; then
                echo -e "${YELLOW}Removing user: $user${NC}"
                remove_user "$user"
            fi
        done
    fi
    
    log_message "Rental service stopped - PC no longer available"
    echo -e "${GREEN}✅ Rental service stopped!${NC}"
    echo -e "${RED}Your PC is no longer available for rental${NC}"
}

show_help() {
    print_banner
    echo "USAGE:"
    echo "  $0 [COMMAND]"
    echo ""
    echo "COMMANDS:"
    echo "  start     🚀 Start rental service (make PC available)"
    echo "  stop      🛑 Stop rental service (make PC unavailable)"  
    echo "  status    📊 Show current status and active users"
    echo "  test      🧪 Create a test SSH user"
    echo "  remove    🗑️  Remove a specific SSH user"
    echo "  users     👥 List all active SSH users"
    echo "  register  ⛓️  Register node with blockchain"
    echo "  nodes     📋 List available nodes on blockchain"
    echo "  balance   💰 Check blockchain wallet balance"
    echo "  help      ❓ Show this help message"
    echo ""
    echo "SETUP:"
    echo "  1. Start SSH service: sudo $SSH_SERVICE_SCRIPT daemon &"
    echo "  2. Configure blockchain: Set PRIVATE_KEY in .env file"
    echo "  3. Register with blockchain: $0 register"
    echo "  4. Start rental: $0 start"
    echo "  5. Create test user: $0 test"
    echo ""
    echo "BLOCKCHAIN COMMANDS:"
    echo "  $0 register              # Register node with Avalanche contracts"
    echo "  $0 nodes                 # List all available rental nodes"
    echo "  $0 balance               # Check AVAX balance"
    echo ""
    echo "EXAMPLES:"
    echo "  $0 start                    # Start accepting SSH rentals"
    echo "  $0 test                     # Create test user"
    echo "  $0 remove eryzaa_job_abc123 # Remove specific user"
    echo "  $0 stop                     # Stop rental service"
}

# Main command handling
case "${1:-help}" in
    "start")
        print_banner
        start_rental
        ;;
    "stop")
        print_banner
        stop_rental
        ;;
    "status")
        print_banner
        show_status
        ;;
    "test")
        print_banner
        if [ "$(get_rental_status)" != "active" ]; then
            echo -e "${RED}❌ Rental service not active. Start it first: $0 start${NC}"
            exit 1
        fi
        if ! check_ssh_service; then
            exit 1
        fi
        create_test_user
        ;;
    "remove")
        print_banner
        if [ -z "$2" ]; then
            echo -e "${RED}❌ Username required. Usage: $0 remove <username>${NC}"
            exit 1
        fi
        remove_user "$2"
        ;;
    "users")
        print_banner
        echo -e "${BLUE}👥 Active SSH Users:${NC}"
        list_active_users
        ;;
    "register")
        print_banner
        echo -e "${BLUE}⛓️ Registering node with blockchain...${NC}"
        if command -v node >/dev/null 2>&1; then
            node "$SCRIPT_DIR/blockchain_integration.cjs" register
        else
            echo -e "${RED}❌ Node.js not installed${NC}"
            exit 1
        fi
        ;;
    "nodes")
        print_banner
        echo -e "${BLUE}📋 Available nodes on blockchain:${NC}"
        if command -v node >/dev/null 2>&1; then
            node "$SCRIPT_DIR/blockchain_integration.cjs" nodes
        else
            echo -e "${RED}❌ Node.js not installed${NC}"
            exit 1
        fi
        ;;
    "balance")
        print_banner
        echo -e "${BLUE}💰 Checking blockchain wallet balance:${NC}"
        if command -v node >/dev/null 2>&1; then
            node "$SCRIPT_DIR/blockchain_integration.cjs" balance
        else
            echo -e "${RED}❌ Node.js not installed${NC}"
            exit 1
        fi
        ;;
    "help"|*)
        show_help
        ;;
esac
