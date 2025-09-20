#!/bin/bash
echo "Installing Eryzaa on Linux..."
echo

# Make executables runnable
chmod +x eryzaa-*

# Check for sudo
if [ "$EUID" -ne 0 ]; then
    echo "Please run with sudo for automatic installation:"
    echo "sudo ./install.sh"
    echo
    echo "Or run applications directly:"
    echo "./eryzaa-rental - Share your computer"
    echo "./eryzaa-client - Access other computers"
    exit 1
fi

echo "Installing system dependencies..."

# Detect package manager and install dependencies
if command -v apt-get >/dev/null 2>&1; then
    apt-get update
    apt-get install -y curl wget docker.io docker-compose
elif command -v pacman >/dev/null 2>&1; then
    pacman -Sy --needed --noconfirm curl wget docker docker-compose
elif command -v yum >/dev/null 2>&1; then
    yum install -y curl wget docker docker-compose
elif command -v dnf >/dev/null 2>&1; then
    dnf install -y curl wget docker docker-compose
else
    echo "Package manager not supported. Please install Docker manually."
    exit 1
fi

# Install ZeroTier
echo "Installing ZeroTier..."
curl -s https://install.zerotier.com | bash

# Join the Eryzaa network
echo "Joining ZeroTier network..."
zerotier-cli join 363c67c55ad2489d

# Enable and start Docker
systemctl enable docker
systemctl start docker

echo
echo "Installation complete!"
echo "ZeroTier network joined: 363c67c55ad2489d"
echo
echo "Usage:"
echo "./eryzaa-rental - Share your computer for rental"
echo "./eryzaa-client - Access rental computers"
echo "./eryzaa-cli - Command-line interface"
echo "./eryzaa-server - Backend server"
