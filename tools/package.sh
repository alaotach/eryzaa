#!/bin/bash

# Simple packaging script for Eryzaa applications
# Creates distribution packages from existing builds

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[PACKAGE]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Create distribution directory
log "Creating distribution packages..."
rm -rf dist/
mkdir -p dist/

# Detect current platform
CURRENT_PLATFORM="x86_64-unknown-linux-gnu"
if [[ "$OSTYPE" == "darwin"* ]]; then
    CURRENT_PLATFORM="x86_64-apple-darwin"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    CURRENT_PLATFORM="x86_64-pc-windows-gnu"
fi

# Create package for current platform
OUTPUT_DIR="dist/$CURRENT_PLATFORM"
mkdir -p "$OUTPUT_DIR"

# Copy binaries
log "Copying binaries for $CURRENT_PLATFORM..."

if [ -f "target/release/eryzaa-client" ]; then
    cp "target/release/eryzaa-client" "$OUTPUT_DIR/"
    log "Copied GUI client"
else
    warn "GUI client not found"
fi

if [ -f "target/release/eryzaa-rental" ]; then
    cp "target/release/eryzaa-rental" "$OUTPUT_DIR/"
    log "Copied GUI rental server"
else
    warn "GUI rental server not found"
fi

if [ -f "target/release/client" ]; then
    cp "target/release/client" "$OUTPUT_DIR/eryzaa-cli"
    log "Copied CLI client"
else
    warn "CLI client not found"
fi

if [ -f "target/release/rental" ]; then
    cp "target/release/rental" "$OUTPUT_DIR/eryzaa-server"
    log "Copied server"
else
    warn "Server not found"
fi

# Copy Docker files and scripts
log "Copying configuration files..."
cp -r docker/ "$OUTPUT_DIR/" 2>/dev/null || warn "Docker files not found"
cp -r blockchain/ "$OUTPUT_DIR/" 2>/dev/null || warn "Blockchain files not found"

# Create README
cat > "$OUTPUT_DIR/README.md" << EOF
# Eryzaa - Decentralized Computing Resource Sharing Platform

This package contains the Eryzaa applications for $CURRENT_PLATFORM.

## What's Included

- \`eryzaa-client\` - GUI client application for accessing rental servers
- \`eryzaa-rental\` - GUI rental server application for sharing your computer
- \`eryzaa-cli\` - Command-line client
- \`eryzaa-server\` - Backend server
- Docker configuration files for ML platform
- Blockchain smart contracts for Avalanche

## Three Access Types

### 1. Direct SSH Access
- Secure remote terminal access via ZeroTier VPN
- Full command-line access to rental servers
- Perfect for development and system administration

### 2. AI Model Training & Inference
- Deploy ML models using Docker containers
- Support for PyTorch, TensorFlow, and custom frameworks
- Dataset management and training pipelines
- Direct inference API endpoints

### 3. Edge Computing with Multiple GPUs
- Distribute compute jobs across multiple GPU nodes
- Automatic load balancing and resource allocation
- Real-time monitoring and job management
- Scalable parallel processing

## Quick Start

### For Renters (Sharing Your Computer)
1. Run \`./eryzaa-rental\`
2. Click "Start One-Click Setup"
3. Configure your rental settings (hourly rate, resources)
4. Share your ZeroTier IP with clients

### For Clients (Accessing Rental Servers)
1. Run \`./eryzaa-client\`
2. Choose your access type (SSH, AI Training, or Edge Computing)
3. Enter the rental server's details
4. Connect and start working

## Blockchain Integration

- **EryzaaToken (ERZC)**: ERC-20 token for payments
- **Marketplace Contract**: Escrow and rental management
- **Staking Contract**: Stake tokens for better rates
- **Payments**: Automated hourly billing via smart contracts

## Platform Requirements

- **Linux**: Automatic installation of Docker and ZeroTier
- **Windows**: Manual installation required (Docker Desktop + ZeroTier)
- **macOS**: Manual installation required (Docker Desktop + ZeroTier)

## Installation

### Linux (Automatic)
\`\`\`bash
sudo ./install.sh
\`\`\`

### Windows/macOS (Manual)
1. Install Docker Desktop: https://www.docker.com/products/docker-desktop
2. Install ZeroTier: https://www.zerotier.com/download/
3. Run the applications

## Network Setup

The platform uses ZeroTier network ID: \`363c67c55ad2489d\`
- Automatic joining on Linux
- Manual joining required on Windows/macOS

## Support

For issues and documentation:
- GitHub: https://github.com/alaotach/eryzaa
- Network: Join ZeroTier network 363c67c55ad2489d
- Smart Contracts: Deployed on Avalanche Fuji testnet

## Security

- All connections encrypted via ZeroTier VPN
- Smart contract escrow for secure payments
- Docker isolation for compute jobs
- SSH key-based authentication
EOF

# Create installer script for Linux
cat > "$OUTPUT_DIR/install.sh" << 'EOF'
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
EOF

chmod +x "$OUTPUT_DIR/install.sh"

# Create archive
log "Creating archive..."
cd dist/
tar -czf "eryzaa-$CURRENT_PLATFORM.tar.gz" "$CURRENT_PLATFORM/"
cd "$PROJECT_ROOT"

log "Package created successfully!"
log "Location: dist/$CURRENT_PLATFORM/"
log "Archive: dist/eryzaa-$CURRENT_PLATFORM.tar.gz"
log ""
log "To test:"
log "1. cd dist/$CURRENT_PLATFORM/"
log "2. ./eryzaa-rental (to share your computer)"
log "3. ./eryzaa-client (to access other computers)"
