#!/bin/bash

# Cross-platform build script for Eryzaa applications
# Supports Linux, Windows, and macOS builds

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[BUILD]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install Rust if not present
install_rust() {
    if ! command_exists rustc; then
        log "Installing Rust..."
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
        
        # Source Rust environment
        if [ -f "$HOME/.cargo/env" ]; then
            source "$HOME/.cargo/env"
        fi
    else
        log "Rust is already installed"
    fi
}

# Function to install Node.js if not present
install_nodejs() {
    if ! command_exists node; then
        log "Installing Node.js..."
        if command_exists apt-get; then
            curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
            sudo apt-get install -y nodejs
        elif command_exists brew; then
            brew install node
        else
            warn "Please install Node.js manually"
        fi
    else
        log "Node.js is already installed"
    fi
}

# Function to setup blockchain environment
setup_blockchain() {
    log "Setting up blockchain environment..."
    
    if [ ! -f ".env" ]; then
        cp .env.example .env
        warn "Created .env file from template. Please configure your environment variables."
    fi
    
    if [ ! -f "package-lock.json" ]; then
        log "Installing blockchain dependencies..."
        npm install
    fi
    
    log "Compiling smart contracts..."
    npx hardhat compile
    
    if [ "$1" = "deploy" ]; then
        log "Deploying smart contracts to test network..."
        npx hardhat run blockchain/scripts/deploy.js --network fuji
    fi
}
    
    fi
}

# Function to setup Rust environment
setup_rust_env() {
    # Make sure cargo and rustup are available
    if [ -f "$HOME/.cargo/env" ]; then
        source "$HOME/.cargo/env"
    fi
    
    # Add cargo bin to PATH if not already there
    if [[ ":$PATH:" != *":$HOME/.cargo/bin:"* ]]; then
        export PATH="$HOME/.cargo/bin:$PATH"
    fi
}
}

# Function to add cross-compilation targets
add_targets() {
    log "Adding cross-compilation targets..."
    
    # Check if rustup is available
    if ! command_exists rustup; then
        warn "rustup not found - cross-compilation targets may not be available"
        warn "On Arch Linux, install rust-src and cross-compilation targets manually:"
        warn "sudo pacman -S rust-src"
        return
    fi
    
    # Add Windows target
    rustup target add x86_64-pc-windows-gnu || warn "Failed to add Windows target"
    
    # Add macOS target (only works on macOS)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        rustup target add x86_64-apple-darwin
        rustup target add aarch64-apple-darwin
    fi
    
    # Add Linux targets
    rustup target add x86_64-unknown-linux-gnu
    rustup target add aarch64-unknown-linux-gnu || warn "Failed to add ARM64 Linux target"
}

# Function to install cross-compilation tools
install_cross_tools() {
    log "Installing cross-compilation tools..."
    
    # Install cross for easier cross-compilation
    if ! command_exists cross; then
        if command_exists rustup; then
            cargo install cross --git https://github.com/cross-rs/cross || warn "Failed to install cross"
        else
            warn "rustup not available - skipping cross installation"
        fi
    fi
    
    # Platform-specific tools
    case "$OSTYPE" in
        linux*)
            # Install Windows cross-compilation tools
            if command_exists apt-get; then
                sudo apt-get update
                sudo apt-get install -y mingw-w64 gcc-aarch64-linux-gnu || warn "Failed to install cross-compilation tools"
            elif command_exists pacman; then
                sudo pacman -S --needed --noconfirm mingw-w64-gcc || warn "Failed to install cross-compilation tools"
            fi
            ;;
        darwin*)
            # macOS tools are usually available
            log "macOS cross-compilation tools available"
            ;;
        msys*|cygwin*)
            # Windows - install Linux cross-compilation tools if needed
            warn "Windows detected - limited cross-compilation support"
            ;;
    esac
}

# Function to build for a specific target
build_target() {
    local target=$1
    local component=$2
    local app_name=$3
    
    log "Building $app_name for $target..."
    
    cd "$PROJECT_ROOT"
    
    # Use cross if available and needed, otherwise use cargo
    if command_exists cross && [[ "$target" != "$(rustc -vV | grep host | cut -d' ' -f2)" ]]; then
        cross build --release --target "$target" -p "$component" || error "Failed to build $app_name for $target"
    else
        cargo build --release --target "$target" -p "$component" || error "Failed to build $app_name for $target"
    fi
}

# Function to package builds
package_builds() {
    local target=$1
    local output_dir="dist/$target"
    
    log "Packaging builds for $target..."
    
    mkdir -p "$output_dir"
    
    # Determine executable extension
    local ext=""
    if [[ "$target" == *"windows"* ]]; then
        ext=".exe"
    fi
    
    # Copy GUI applications
    if [ -f "target/$target/release/eryzaa-client$ext" ]; then
        cp "target/$target/release/eryzaa-client$ext" "$output_dir/"
        log "Copied GUI client for $target"
    fi
    
    if [ -f "target/$target/release/eryzaa-rental$ext" ]; then
        cp "target/$target/release/eryzaa-rental$ext" "$output_dir/"
        log "Copied GUI rental server for $target"
    fi
    
    # Copy CLI client
    if [ -f "target/$target/release/client$ext" ]; then
        cp "target/$target/release/client$ext" "$output_dir/eryzaa-cli$ext"
        log "Copied CLI client for $target"
    fi
    
    # Copy rental server
    if [ -f "target/$target/release/rental$ext" ]; then
        cp "target/$target/release/rental$ext" "$output_dir/eryzaa-server$ext"
        log "Copied server for $target"
    fi
    
    # Copy Docker files and scripts
    cp -r docker/ "$output_dir/" 2>/dev/null || warn "Docker files not found"
    cp manage.sh "$output_dir/" 2>/dev/null || warn "manage.sh not found"
    cp Dockerfile* "$output_dir/" 2>/dev/null || warn "Dockerfiles not found"
    cp docker-compose*.yml "$output_dir/" 2>/dev/null || warn "Docker compose files not found"
    
    # Create README for the target
    cat > "$output_dir/README.md" << EOF
# Eryzaa - Cross-platform Computing Resource Sharing

This package contains the Eryzaa applications for $target.

## What's Included

- \`eryzaa-client$ext\` - GUI client application for accessing rental servers
- \`eryzaa-rental$ext\` - GUI rental server application for sharing your computer
- \`eryzaa-cli$ext\` - Command-line client (if available)
- Docker configuration files for server deployment

## Quick Start

### For Renters (Sharing Your Computer)
1. Run \`eryzaa-rental$ext\`
2. Click "Start One-Click Setup"
3. Share your ZeroTier IP with clients

### For Clients (Accessing Rental Servers)
1. Run \`eryzaa-client$ext\`
2. Enter the rental server's ZeroTier IP
3. Connect via SSH or deploy your own containers

## Requirements

- Docker (automatically installed on Linux)
- ZeroTier (automatically installed on Linux)
- Administrator/sudo privileges for initial setup

## Platform Notes

- **Linux**: Full automatic installation support
- **Windows**: Manual Docker Desktop and ZeroTier installation required
- **macOS**: Manual Docker Desktop and ZeroTier installation required

## Support

For issues and documentation, visit: https://github.com/alaotach/eryzaa
EOF
    
    # Create platform-specific installer script
    create_installer "$target" "$output_dir"
    
    log "Package created: $output_dir"
}

# Function to create platform-specific installer
create_installer() {
    local target=$1
    local output_dir=$2
    
    if [[ "$target" == *"windows"* ]]; then
        # Windows batch installer
        cat > "$output_dir/install.bat" << 'EOF'
@echo off
echo Installing Eryzaa on Windows...
echo.
echo Please install the following manually:
echo 1. Docker Desktop: https://www.docker.com/products/docker-desktop
echo 2. ZeroTier: https://www.zerotier.com/download/
echo.
echo After installation:
echo 1. Run Docker Desktop
echo 2. Run eryzaa-rental.exe to share your computer
echo 3. Run eryzaa-client.exe to access other computers
echo.
pause
EOF
    elif [[ "$target" == *"apple"* ]] || [[ "$target" == *"darwin"* ]]; then
        # macOS installer script
        cat > "$output_dir/install.sh" << 'EOF'
#!/bin/bash
echo "Installing Eryzaa on macOS..."
echo
echo "Checking for Homebrew..."
if ! command -v brew >/dev/null 2>&1; then
    echo "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

echo "Please install the following:"
echo "1. Docker Desktop: brew install --cask docker"
echo "2. ZeroTier: brew install --cask zerotier-one"
echo
echo "Or install manually from:"
echo "- https://www.docker.com/products/docker-desktop"
echo "- https://www.zerotier.com/download/"
echo
echo "After installation, run:"
echo "- ./eryzaa-rental to share your computer"
echo "- ./eryzaa-client to access other computers"
EOF
        chmod +x "$output_dir/install.sh"
    else
        # Linux installer script
        cat > "$output_dir/install.sh" << 'EOF'
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

# Enable and start Docker
systemctl enable docker
systemctl start docker

echo
echo "Installation complete!"
echo "Run: ./eryzaa-rental - to share your computer"
echo "Run: ./eryzaa-client - to access other computers"
EOF
        chmod +x "$output_dir/install.sh"
    fi
}

# Function to create archives
create_archives() {
    log "Creating distribution archives..."
    
    cd dist
    
    for target_dir in */; do
        target=$(basename "$target_dir")
        log "Creating archive for $target..."
        
        if [[ "$target" == *"windows"* ]]; then
            # Create ZIP for Windows
            zip -r "eryzaa-$target.zip" "$target/" >/dev/null
        else
            # Create tar.gz for Unix systems
            tar -czf "eryzaa-$target.tar.gz" "$target/"
        fi
    done
    
    cd "$SCRIPT_DIR"
    log "Archives created in dist/ directory"
}

# Main build function
main() {
    local targets=()
    local build_all=false
    local create_packages=false
    local deploy_contracts=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --all)
                build_all=true
                shift
                ;;
            --package)
                create_packages=true
                shift
                ;;
            --deploy)
                deploy_contracts=true
                shift
                ;;
            --target)
                targets+=("$2")
                shift 2
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --all                 Build for all supported targets"
                echo "  --target TARGET       Build for specific target"
                echo "  --package            Create distribution packages"
                echo "  --deploy             Deploy smart contracts to test network"
                echo "  --help               Show this help"
                echo
                echo "Supported targets:"
                echo "  x86_64-unknown-linux-gnu     (Linux x64)"
                echo "  aarch64-unknown-linux-gnu    (Linux ARM64)"
                echo "  x86_64-pc-windows-gnu        (Windows x64)"
                echo "  x86_64-apple-darwin          (macOS Intel)"
                echo "  aarch64-apple-darwin         (macOS Apple Silicon)"
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Set default targets if none specified
    if [[ ${#targets[@]} -eq 0 ]] && [[ "$build_all" == false ]]; then
        # Build for current platform by default
        local current_target=$(rustc -vV | grep host | cut -d' ' -f2)
        targets=("$current_target")
    fi
    
    if [[ "$build_all" == true ]]; then
        targets=(
            "x86_64-unknown-linux-gnu"
            "aarch64-unknown-linux-gnu"
            "x86_64-pc-windows-gnu"
        )
        
        # Add macOS targets if building on macOS
        if [[ "$OSTYPE" == "darwin"* ]]; then
            targets+=("x86_64-apple-darwin")
            targets+=("aarch64-apple-darwin")
        fi
    fi
    
    log "Starting Eryzaa cross-platform build"
    log "Targets: ${targets[*]}"
    
    # Setup
    install_rust
    install_nodejs
    setup_rust_env
    add_targets
    install_cross_tools
    
    # Setup blockchain environment
    if [[ "$deploy_contracts" == true ]]; then
        setup_blockchain "deploy"
    else
        setup_blockchain
    fi
    
    # Clean previous builds
    rm -rf dist/
    mkdir -p dist/
    
    # Build each target
    for target in "${targets[@]}"; do
        log "Building for target: $target"
        
        # Build GUI applications
        build_target "$target" "eryzaa-client-gui" "GUI Client"
        build_target "$target" "eryzaa-rental-gui" "GUI Rental Server"
        
        # Build CLI client
        build_target "$target" "client" "CLI Client"
        
        # Build rental server
        build_target "$target" "rental" "Rental Server"
        
        # Package builds if requested
        if [[ "$create_packages" == true ]]; then
            package_builds "$target"
        fi
    done
    
    # Create archives if packaging
    if [[ "$create_packages" == true ]]; then
        create_archives
    fi
    
    log "Build complete!"
    log "Built targets: ${targets[*]}"
    
    if [[ "$create_packages" == true ]]; then
        log "Distribution packages available in dist/ directory"
        ls -la dist/
    fi
}

# Run main function with all arguments
main "$@"
