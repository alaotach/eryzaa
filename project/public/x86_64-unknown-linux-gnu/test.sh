#!/bin/bash

# Eryzaa Platform Testing Script
# Comprehensive testing for all three access types

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[TEST]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running in the distribution directory
if [ ! -f "eryzaa-client" ] || [ ! -f "eryzaa-rental" ]; then
    error "Please run this script from the Eryzaa distribution directory"
    echo "Expected files: eryzaa-client, eryzaa-rental, eryzaa-cli, eryzaa-server"
    exit 1
fi

echo "🚀 Eryzaa Platform Testing Suite"
echo "================================="
echo

# Test 1: Check all binaries
log "Testing binary executables..."
for binary in eryzaa-client eryzaa-rental eryzaa-cli eryzaa-server; do
    if [ -x "$binary" ]; then
        info "✓ $binary is executable"
    else
        error "✗ $binary is not executable or missing"
        exit 1
    fi
done
echo

# Test 2: Check system dependencies
log "Checking system dependencies..."

# Check for ZeroTier
if command -v zerotier-cli >/dev/null 2>&1; then
    info "✓ ZeroTier is installed"
    zerotier-cli info 2>/dev/null || warn "ZeroTier service may not be running"
else
    warn "✗ ZeroTier not found - install with: curl -s https://install.zerotier.com | sudo bash"
fi

# Check for Docker
if command -v docker >/dev/null 2>&1; then
    info "✓ Docker is installed"
    if docker info >/dev/null 2>&1; then
        info "✓ Docker service is running"
    else
        warn "✗ Docker service is not running - start with: sudo systemctl start docker"
    fi
else
    warn "✗ Docker not found - install with package manager or Docker Desktop"
fi

# Check for Node.js (for blockchain)
if command -v node >/dev/null 2>&1; then
    info "✓ Node.js is installed ($(node --version))"
else
    warn "✗ Node.js not found - needed for blockchain features"
fi
echo

# Test 3: Network connectivity
log "Testing network connectivity..."

# Test internet connection
if ping -c 1 google.com >/dev/null 2>&1; then
    info "✓ Internet connectivity available"
else
    warn "✗ No internet connection - some features may not work"
fi

# Test ZeroTier network
if command -v zerotier-cli >/dev/null 2>&1; then
    NETWORK_ID="363c67c55ad2489d"
    if zerotier-cli listnetworks 2>/dev/null | grep -q "$NETWORK_ID"; then
        info "✓ Connected to Eryzaa ZeroTier network ($NETWORK_ID)"
    else
        warn "✗ Not connected to Eryzaa network - join with: sudo zerotier-cli join $NETWORK_ID"
    fi
fi
echo

# Test 4: Quick binary tests
log "Testing application startup..."

# Test CLI help
info "Testing CLI application..."
if ./eryzaa-cli --help >/dev/null 2>&1; then
    info "✓ CLI application responds to --help"
else
    warn "✗ CLI application may have issues"
fi

# Note: GUI applications require display, so we can't test them in headless mode
warn "GUI applications (eryzaa-client, eryzaa-rental) require display - test manually"
echo

# Test 5: Blockchain components
log "Testing blockchain components..."

if [ -d "blockchain" ]; then
    info "✓ Blockchain directory found"
    
    if [ -f "blockchain/contracts/EryzaaToken.sol" ]; then
        info "✓ Smart contracts found"
    else
        warn "✗ Smart contracts missing"
    fi
    
    if [ -f "blockchain/package.json" ]; then
        info "✓ Blockchain dependencies configuration found"
    else
        warn "✗ Blockchain package.json missing"
    fi
else
    warn "✗ Blockchain directory not found"
fi
echo

# Test 6: File permissions and structure
log "Checking file structure..."

for file in README.md install.sh; do
    if [ -f "$file" ]; then
        info "✓ $file present"
    else
        warn "✗ $file missing"
    fi
done
echo

# Summary and next steps
echo "🎯 Testing Summary"
echo "=================="
echo

echo "✅ Ready to test:"
echo "1. GUI Rental Server: ./eryzaa-rental"
echo "2. GUI Client: ./eryzaa-client"
echo "3. CLI Client: ./eryzaa-cli --help"
echo "4. Backend Server: ./eryzaa-server"
echo

echo "🔧 Manual testing steps:"
echo

echo "📋 Test 1: Setup Rental Server"
echo "1. Run: ./eryzaa-rental"
echo "2. Click 'Start One-Click Setup'"
echo "3. Configure hourly rate and resources"
echo "4. Note the ZeroTier IP address"
echo "5. Leave server running"
echo

echo "📋 Test 2: Connect as Client"
echo "1. Open new terminal"
echo "2. Run: ./eryzaa-client"
echo "3. Test SSH Access:"
echo "   - Enter rental server IP"
echo "   - Choose 'SSH Access'"
echo "   - Verify connection works"
echo "4. Test AI Training:"
echo "   - Choose 'AI Training'"
echo "   - Try deploying a simple model"
echo "5. Test Edge Computing:"
echo "   - Choose 'Edge Computing'"
echo "   - Submit a test job"
echo

echo "📋 Test 3: Blockchain Features"
echo "1. cd blockchain/"
echo "2. npm install"
echo "3. npx hardhat compile"
echo "4. npx hardhat test"
echo "5. Deploy to testnet: npx hardhat run scripts/deploy.js --network fuji"
echo

echo "📋 Test 4: Docker ML Platform"
echo "1. Ensure Docker is running"
echo "2. Test model deployment via GUI"
echo "3. Check container status: docker ps"
echo "4. View logs: docker logs <container_id>"
echo

echo "🌐 Network Information:"
echo "- ZeroTier Network: 363c67c55ad2489d"
echo "- Join command: sudo zerotier-cli join 363c67c55ad2489d"
echo "- Check status: zerotier-cli listnetworks"
echo

echo "💰 Blockchain Information:"
echo "- Network: Avalanche Fuji Testnet"
echo "- Tokens: EryzaaToken (ERZC)"
echo "- Contracts: Marketplace, Staking"
echo

echo "📚 Documentation:"
echo "- README.md - Platform overview"
echo "- blockchain/README.md - Smart contract details"
echo "- install.sh - Automatic Linux installation"
echo

if [ -f "install.sh" ] && [ "$EUID" -ne 0 ]; then
    warn "For automatic installation, run: sudo ./install.sh"
fi

log "Testing script complete! Start with ./eryzaa-rental and ./eryzaa-client"
