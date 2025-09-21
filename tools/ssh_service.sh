#!/bin/bash
# Eryzaa SSH Management Service
# This script should be run as root to manage SSH users

USER_PREFIX="eryzaa_job_"
SOCKET_PATH="/tmp/eryzaa_ssh_service.sock"

log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a /var/log/eryzaa_ssh_service.log
}

create_ssh_user() {
    local username="$1"
    local password="$2"
    
    log_message "Creating SSH user in Ubuntu container: $username"
    
    # Check if the eryzaa-ubuntu-ssh container is running
    if ! docker ps | grep -q eryzaa-ubuntu-ssh; then
        log_message "Starting eryzaa-ubuntu-ssh container..."
        cd /home/aloo/eryzaa/infrastructure/docker
        docker-compose -f docker-compose.ssh.yml up -d
        sleep 5
    fi
    
    # Create user inside the container
    if docker exec eryzaa-ubuntu-ssh useradd -m -s /bin/bash "$username"; then
        log_message "User $username created successfully in container"
    else
        log_message "Failed to create user $username in container"
        return 1
    fi
    
    # Set password inside the container
    if docker exec eryzaa-ubuntu-ssh bash -c "echo '$username:$password' | chpasswd"; then
        log_message "Password set for user $username in container"
    else
        log_message "Failed to set password for user $username in container"
        return 1
    fi
    
    # Add to sudo group in container
    if docker exec eryzaa-ubuntu-ssh getent group sudo > /dev/null 2>&1; then
        docker exec eryzaa-ubuntu-ssh usermod -aG sudo "$username"
        log_message "Added $username to sudo group in container"
    fi
    
    # Create a simple info file in container
    docker exec eryzaa-ubuntu-ssh bash -c "echo 'Eryzaa rental user created at $(date)' > '/home/$username/.eryzaa_info'"
    docker exec eryzaa-ubuntu-ssh chown "$username:$username" "/home/$username/.eryzaa_info"
    
    log_message "SSH user $username ready - connect via: ssh $username@localhost -p 2222"
    
    return 0
}

remove_ssh_user() {
    local username="$1"
    
    log_message "Removing SSH user from container: $username"
    
    # Check if container is running
    if ! docker ps | grep -q eryzaa-ubuntu-ssh; then
        log_message "Container not running, user $username already removed"
        return 0
    fi
    
    # Kill any processes owned by the user in container
    docker exec eryzaa-ubuntu-ssh pkill -u "$username" 2>/dev/null || true
    
    # Remove user and home directory from container
    if docker exec eryzaa-ubuntu-ssh userdel -r "$username" 2>/dev/null; then
        log_message "User $username removed successfully from container"
        return 0
    else
        log_message "Failed to remove user $username from container"
        return 1
    fi
}

list_eryzaa_users() {
    if docker ps | grep -q eryzaa-ubuntu-ssh; then
        docker exec eryzaa-ubuntu-ssh getent passwd | grep "^${USER_PREFIX}" | cut -d: -f1
    else
        echo "Container not running"
    fi
}

# Socket server to handle requests
handle_request() {
    local request="$1"
    local action=$(echo "$request" | cut -d'|' -f1)
    local username=$(echo "$request" | cut -d'|' -f2)
    local password=$(echo "$request" | cut -d'|' -f3)
    
    case "$action" in
        "create")
            if [[ "$username" =~ ^${USER_PREFIX}[a-zA-Z0-9_]{8}$ ]]; then
                create_ssh_user "$username" "$password"
                echo "SUCCESS"
            else
                echo "ERROR: Invalid username format"
            fi
            ;;
        "remove")
            if [[ "$username" =~ ^${USER_PREFIX}[a-zA-Z0-9_]{8}$ ]]; then
                remove_ssh_user "$username"
                echo "SUCCESS"
            else
                echo "ERROR: Invalid username format"
            fi
            ;;
        "list")
            list_eryzaa_users
            ;;
        *)
            echo "ERROR: Unknown action"
            ;;
    esac
}

# Main service loop
main() {
    if [[ $EUID -ne 0 ]]; then
        echo "This script must be run as root"
        exit 1
    fi
    
    log_message "Starting Eryzaa SSH management service"
    
    # Remove old socket if exists
    rm -f "$SOCKET_PATH"
    
    # Create named pipe for communication
    mkfifo "$SOCKET_PATH"
    chmod 666 "$SOCKET_PATH"
    
    log_message "Service listening on $SOCKET_PATH"
    
    while true; do
        if read -r request < "$SOCKET_PATH"; then
            response=$(handle_request "$request")
            echo "$response" > "${SOCKET_PATH}.response"
        fi
    done
}

# Handle cleanup on exit
cleanup() {
    log_message "Shutting down Eryzaa SSH management service"
    rm -f "$SOCKET_PATH" "${SOCKET_PATH}.response"
    exit 0
}

trap cleanup SIGTERM SIGINT

# Check command line arguments
case "${1:-daemon}" in
    "daemon")
        main
        ;;
    "create")
        create_ssh_user "$2" "$3"
        ;;
    "remove")
        remove_ssh_user "$2"
        ;;
    "list")
        list_eryzaa_users
        ;;
    *)
        echo "Usage: $0 [daemon|create|remove|list] [username] [password]"
        exit 1
        ;;
esac
