#!/bin/bash

echo "=== Development Environment Starting ==="

# Start ZeroTier service
echo "Starting ZeroTier service..."
zerotier-one -d

# Wait for ZeroTier to start
sleep 3

# Join the ZeroTier network if ZEROTIER_NETWORK_ID is provided
if [ ! -z "$ZEROTIER_NETWORK_ID" ]; then
    echo "Joining ZeroTier network: $ZEROTIER_NETWORK_ID"
    zerotier-cli join $ZEROTIER_NETWORK_ID
    
    # Wait for network to be joined and get IP
    echo "Waiting for ZeroTier IP assignment..."
    for i in {1..30}; do
        ZT_IP=$(zerotier-cli listnetworks | grep $ZEROTIER_NETWORK_ID | awk '{print $9}' | head -1)
        if [ ! -z "$ZT_IP" ] && [ "$ZT_IP" != "-" ]; then
            echo "ZeroTier IP assigned: $ZT_IP"
            break
        fi
        sleep 2
    done
fi

# Start SSH service
echo "Starting SSH service..."
service ssh start

# Set up development environment
echo "Setting up development environment..."

# Create initial Cargo projects if they don't exist
if [ ! -f "/workspace/rental/Cargo.toml" ]; then
    echo "Creating rental project..."
    su - rental -c "cd /workspace && /home/rental/.cargo/bin/cargo new rental"
fi

if [ ! -f "/workspace/client/Cargo.toml" ]; then
    echo "Creating client project..."
    su - rental -c "cd /workspace && /home/rental/.cargo/bin/cargo new client"
fi

# Function to watch and rebuild rental application
watch_rental() {
    echo "Starting rental application with auto-reload..."
    cd /workspace/rental
    
    # Build once initially
    su - rental -c "cd /workspace/rental && /home/rental/.cargo/bin/cargo build"
    
    # Watch for changes and rebuild
    su - rental -c "cd /workspace/rental && /home/rental/.cargo/bin/cargo watch -x 'run'" &
}

# Function to watch client application
watch_client() {
    echo "Watching client application..."
    cd /workspace/client
    su - rental -c "cd /workspace/client && /home/rental/.cargo/bin/cargo watch -x 'check'" &
}

# Start development watchers
watch_rental
watch_client

# Development information
echo ""
echo "=================================="
echo "🚀 DEVELOPMENT ENVIRONMENT READY!"
echo "=================================="
echo "ZeroTier Network ID: $ZEROTIER_NETWORK_ID"
echo "SSH Access: ssh rental@<zerotier_ip>"
echo "Root SSH Access: ssh root@<zerotier_ip>"
echo ""
echo "📁 Source code is mounted from host:"
echo "   - rental/src -> /workspace/rental/src"
echo "   - client/src -> /workspace/client/src"
echo ""
echo "🔄 Auto-reload is enabled:"
echo "   - Edit files on host, they rebuild automatically in container"
echo "   - Cargo watch is monitoring for changes"
echo ""
echo "🛠️ Development commands:"
echo "   docker exec -it rental-server-dev bash"
echo "   docker exec -it rental-server-dev su - rental"
echo ""
echo "📊 Logs:"
echo "   docker logs -f rental-server-dev"
echo ""
echo "⚡ The rental application will auto-restart on code changes!"
echo "=================================="

# Keep the container alive and show logs
tail -f /dev/null
