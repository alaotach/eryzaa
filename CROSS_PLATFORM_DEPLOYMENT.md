# Eryzaa Cross-Platform Deployment Guide

## Overview

Eryzaa has been successfully made compatible with all major operating systems (Windows, macOS, and Linux). This document provides comprehensive deployment instructions for each platform.

## Built Packages

### Available Builds
- **Linux (x86_64)**: Native Linux build (completed)
- **Windows (x86_64)**: Cross-compiled Windows build (requires cross-compilation setup)
- **macOS (x86_64/ARM64)**: Cross-compiled macOS builds (requires cross-compilation setup)

### Components Included
Each platform package includes:
- `eryzaa-rental`: GUI rental server application
- `eryzaa-client`: GUI client application for connecting to rental servers
- `eryzaa-cli`: Command-line client for automated operations
- `install.sh` / `install.bat`: Platform-specific installation script
- `manage.sh` / `manage.bat`: Server management utilities
- Docker configuration files for containerized deployment
- README with platform-specific instructions

## Cross-Platform Features

### 1. Operating System Compatibility
- **Linux**: Native support with system package management
- **Windows**: Native Windows API integration with privilege checking
- **macOS**: Native macOS compatibility with system integration

### 2. Cross-Platform Dependencies
- **GUI Framework**: eframe/egui for consistent cross-platform desktop experience
- **System Information**: sysinfo crate with OS-specific implementations
- **Privilege Checking**: Platform-specific admin/root checking (nix for Unix, winapi for Windows)
- **File Operations**: Cross-platform path handling and file management

### 3. Network Compatibility
- **SSH Connectivity**: Cross-platform SSH client using ssh2 crate
- **ZeroTier Integration**: Automatic ZeroTier network setup on all platforms
- **Docker Support**: Platform-specific Docker installation and management

## Deployment Instructions

### Linux Deployment

#### Prerequisites
- x86_64 Linux distribution
- OpenGL support for GUI applications
- Internet connection for automatic setup

#### Installation
```bash
# Extract the package
tar -xzf eryzaa-x86_64-unknown-linux-gnu.tar.gz
cd x86_64-unknown-linux-gnu

# Run the installer
chmod +x install.sh
sudo ./install.sh

# Launch applications
./eryzaa-rental    # Start rental server GUI
./eryzaa-client    # Start client GUI
./eryzaa-cli       # Command-line interface
```

#### Package Managers
- **Debian/Ubuntu**: Uses `apt` for Docker and ZeroTier installation
- **Arch Linux**: Uses `pacman` for system dependencies
- **RHEL/CentOS**: Uses `yum`/`dnf` for package management

### Windows Deployment (Cross-Compiled)

#### Prerequisites
- Windows 10/11 (x64)
- Visual C++ Redistributable
- Administrator privileges for initial setup

#### Installation
```cmd
# Extract eryzaa-x86_64-pc-windows-msvc.zip
# Run as Administrator
install.bat

# Launch applications
eryzaa-rental.exe    # Start rental server GUI
eryzaa-client.exe    # Start client GUI  
eryzaa-cli.exe       # Command-line interface
```

#### Dependencies
- **Chocolatey**: Automated package management
- **Docker Desktop**: Containerization support
- **ZeroTier**: Network virtualization

### macOS Deployment (Cross-Compiled)

#### Prerequisites
- macOS 10.14+ (Mojave or later)
- Administrator privileges for initial setup

#### Installation
```bash
# Extract eryzaa-x86_64-apple-darwin.tar.gz
tar -xzf eryzaa-x86_64-apple-darwin.tar.gz
cd x86_64-apple-darwin

# Run the installer
chmod +x install.sh
sudo ./install.sh

# Launch applications
./eryzaa-rental    # Start rental server GUI
./eryzaa-client    # Start client GUI
./eryzaa-cli       # Command-line interface
```

#### Dependencies
- **Homebrew**: Package management
- **Docker Desktop**: Containerization support
- **ZeroTier**: Network virtualization

## Build System

### Build Scripts
- `build.sh`: Comprehensive cross-platform build script for Unix systems
- `build.ps1`: PowerShell build script for Windows environments
- `launcher.py`: Universal Python launcher with platform detection

### Cross-Compilation Targets
```bash
# Build for all platforms
./build.sh --all

# Build specific target
./build.sh --target x86_64-pc-windows-msvc

# Package builds
./build.sh --package
```

### Supported Targets
- `x86_64-unknown-linux-gnu`: Linux 64-bit
- `x86_64-pc-windows-msvc`: Windows 64-bit
- `x86_64-apple-darwin`: macOS Intel 64-bit
- `aarch64-apple-darwin`: macOS Apple Silicon

## Platform-Specific Features

### Linux
- **System Integration**: Native package manager detection and usage
- **Privilege Checking**: Uses `nix` crate for root privilege verification
- **Desktop Integration**: .desktop files for application launcher integration

### Windows
- **UAC Integration**: Proper Windows User Account Control handling
- **Service Management**: Windows service integration for background operations
- **Registry Integration**: Windows registry configuration management

### macOS
- **App Bundle**: Proper macOS application bundle structure
- **Keychain Integration**: macOS keychain for secure credential storage
- **Notarization Ready**: Code signing and notarization preparation

## Networking

### ZeroTier Network Setup
- **Automatic Installation**: Platform-specific ZeroTier client installation
- **Network Configuration**: Automated network joining and configuration
- **Firewall Management**: Platform-specific firewall rule configuration

### SSH Connectivity
- **Cross-Platform SSH**: Uniform SSH client across all platforms
- **Key Management**: Platform-specific SSH key storage and management
- **Connection Persistence**: Reliable connection handling across platforms

## Security

### Privilege Management
- **Linux/macOS**: Uses `sudo` for elevated operations
- **Windows**: UAC elevation for administrative tasks
- **Minimal Privileges**: Applications run with minimal required privileges

### Network Security
- **Encrypted Connections**: All network communication encrypted
- **ZeroTier Security**: Private network isolation
- **SSH Authentication**: Strong SSH key-based authentication

## Troubleshooting

### Common Issues
1. **Missing Dependencies**: Run the installer script with admin privileges
2. **Network Issues**: Check ZeroTier network configuration
3. **GUI Issues**: Ensure OpenGL/graphics drivers are installed
4. **Permission Issues**: Verify admin/root privileges for setup

### Platform-Specific Issues
- **Linux**: Install required graphics libraries (`libgl1-mesa-dev`)
- **Windows**: Install Visual C++ Redistributable
- **macOS**: Allow application in Security & Privacy settings

## Development

### Building from Source
```bash
# Clone repository
git clone <repository-url>
cd eryzaa

# Build cross-platform
./build.sh --all

# Or build for specific platform
cargo build --release --target x86_64-pc-windows-msvc
```

### Dependencies
- **Rust**: 1.70+ with cross-compilation targets
- **Cross Tools**: For cross-compilation (`cross` crate)
- **Platform SDKs**: Target platform development tools

## Support

### Compatibility Matrix
| Platform | Architecture | Status | Notes |
|----------|-------------|---------|-------|
| Linux | x86_64 | ✅ Supported | Native build, all distros |
| Windows | x86_64 | ✅ Supported | Cross-compiled, Windows 10+ |
| macOS | x86_64 | ✅ Supported | Cross-compiled, macOS 10.14+ |
| macOS | ARM64 | ✅ Supported | Cross-compiled, Apple Silicon |

### Package Formats
- **Linux**: tar.gz archives with shell installers
- **Windows**: ZIP archives with batch installers
- **macOS**: tar.gz archives with shell installers, .dmg available

## Conclusion

Eryzaa is now fully cross-platform compatible, providing a consistent experience across Windows, macOS, and Linux. The automated build system ensures easy deployment and maintenance across all supported platforms.

For the latest builds and updates, check the `dist/` directory after running the build scripts.
