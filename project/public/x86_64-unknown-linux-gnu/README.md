# Eryzaa - Decentralized Computing Resource Sharing Platform

This package contains the Eryzaa applications for x86_64-unknown-linux-gnu.

## What's Included

- `eryzaa-client` - GUI client application for accessing rental servers
- `eryzaa-rental` - GUI rental server application for sharing your computer
- `eryzaa-cli` - Command-line client
- `eryzaa-server` - Backend server
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
1. Run `./eryzaa-rental`
2. Click "Start One-Click Setup"
3. Configure your rental settings (hourly rate, resources)
4. Share your ZeroTier IP with clients

### For Clients (Accessing Rental Servers)
1. Run `./eryzaa-client`
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
```bash
sudo ./install.sh
```

### Windows/macOS (Manual)
1. Install Docker Desktop: https://www.docker.com/products/docker-desktop
2. Install ZeroTier: https://www.zerotier.com/download/
3. Run the applications

## Network Setup

The platform uses ZeroTier network ID: `363c67c55ad2489d`
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
