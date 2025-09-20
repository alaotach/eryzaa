#!/bin/bash

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

# Run the rental application as rental user
echo "Starting rental application..."
su - rental -c "cd /workspace/rental && ./target/release/rental" &

# Keep container running
echo "Container is ready!"
echo "ZeroTier Network ID: $ZEROTIER_NETWORK_ID"
echo "SSH Access: ssh rental@<zerotier_ip>"
echo "Root SSH Access: ssh root@<zerotier_ip>"

# Keep the container alive
tail -f /dev/null
