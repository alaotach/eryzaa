# Cross-platform build script for Eryzaa applications (PowerShell)
# Supports Windows, Linux, and macOS builds

param(
    [switch]$All,
    [switch]$Package,
    [string[]]$Target = @(),
    [switch]$Help
)

# Colors for output
$Colors = @{
    Red = 'Red'
    Green = 'Green'
    Yellow = 'Yellow'
    Blue = 'Blue'
}

function Write-Log {
    param([string]$Message)
    Write-Host "[BUILD] $Message" -ForegroundColor $Colors.Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor $Colors.Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Colors.Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Colors.Blue
}

function Test-Command {
    param([string]$Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

function Install-Rust {
    if (-not (Test-Command "rustc")) {
        Write-Log "Installing Rust..."
        Invoke-WebRequest -Uri "https://win.rustup.rs/x86_64" -OutFile "rustup-init.exe"
        Start-Process -FilePath "rustup-init.exe" -ArgumentList "-y" -Wait
        Remove-Item "rustup-init.exe"
        
        # Refresh environment
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    } else {
        Write-Log "Rust is already installed"
    }
}

function Add-Targets {
    Write-Log "Adding cross-compilation targets..."
    
    # Add Windows targets
    rustup target add x86_64-pc-windows-msvc
    rustup target add x86_64-pc-windows-gnu
    
    # Add Linux targets
    rustup target add x86_64-unknown-linux-gnu
    
    # Add macOS targets
    rustup target add x86_64-apple-darwin
    rustup target add aarch64-apple-darwin
}

function Install-CrossTools {
    Write-Log "Installing cross-compilation tools..."
    
    # Install cross for easier cross-compilation
    if (-not (Test-Command "cross")) {
        cargo install cross --git https://github.com/cross-rs/cross
    }
    
    # Windows-specific tools
    if (-not (Test-Command "docker")) {
        Write-Warn "Docker Desktop not found. Please install from https://www.docker.com/products/docker-desktop"
    }
}

function Build-Target {
    param(
        [string]$TargetTriple,
        [string]$AppDir,
        [string]$AppName
    )
    
    Write-Log "Building $AppName for $TargetTriple..."
    
    Push-Location $AppDir
    
    try {
        # Use cross if available and needed, otherwise use cargo
        if ((Test-Command "cross") -and ($TargetTriple -ne (rustc -vV | Select-String "host" | ForEach-Object { ($_ -split ' ')[1] }))) {
            cross build --release --target $TargetTriple
        } else {
            cargo build --release --target $TargetTriple
        }
    } catch {
        Write-Error "Failed to build $AppName for $TargetTriple"
        throw
    } finally {
        Pop-Location
    }
}

function New-Package {
    param(
        [string]$TargetTriple,
        [string]$OutputDir
    )
    
    Write-Log "Packaging builds for $TargetTriple..."
    
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
    
    # Determine executable extension
    $ext = if ($TargetTriple -like "*windows*") { ".exe" } else { "" }
    
    # Copy GUI applications
    $clientPath = "gui-client/target/$TargetTriple/release/eryzaa-client$ext"
    if (Test-Path $clientPath) {
        Copy-Item $clientPath $OutputDir/
        Write-Log "Copied GUI client for $TargetTriple"
    }
    
    $rentalPath = "gui-rental/target/$TargetTriple/release/eryzaa-rental$ext"
    if (Test-Path $rentalPath) {
        Copy-Item $rentalPath $OutputDir/
        Write-Log "Copied GUI rental server for $TargetTriple"
    }
    
    # Copy CLI client
    $cliPath = "client/target/$TargetTriple/release/client$ext"
    if (Test-Path $cliPath) {
        Copy-Item $cliPath "$OutputDir/eryzaa-cli$ext"
        Write-Log "Copied CLI client for $TargetTriple"
    }
    
    # Copy Docker files and scripts
    if (Test-Path "docker") {
        Copy-Item -Recurse "docker" $OutputDir/ -ErrorAction SilentlyContinue
    }
    if (Test-Path "manage.sh") {
        Copy-Item "manage.sh" $OutputDir/ -ErrorAction SilentlyContinue
    }
    Get-ChildItem "Dockerfile*" -ErrorAction SilentlyContinue | Copy-Item -Destination $OutputDir/
    Get-ChildItem "docker-compose*.yml" -ErrorAction SilentlyContinue | Copy-Item -Destination $OutputDir/
    
    # Create README for the target
    $readmeContent = @"
# Eryzaa - Cross-platform Computing Resource Sharing

This package contains the Eryzaa applications for $TargetTriple.

## What's Included

- ``eryzaa-client$ext`` - GUI client application for accessing rental servers
- ``eryzaa-rental$ext`` - GUI rental server application for sharing your computer
- ``eryzaa-cli$ext`` - Command-line client (if available)
- Docker configuration files for server deployment

## Quick Start

### For Renters (Sharing Your Computer)
1. Run ``eryzaa-rental$ext``
2. Click "Start One-Click Setup"
3. Share your ZeroTier IP with clients

### For Clients (Accessing Rental Servers)
1. Run ``eryzaa-client$ext``
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
"@
    
    $readmeContent | Out-File -FilePath "$OutputDir/README.md" -Encoding UTF8
    
    # Create platform-specific installer
    New-Installer $TargetTriple $OutputDir
    
    Write-Log "Package created: $OutputDir"
}

function New-Installer {
    param(
        [string]$TargetTriple,
        [string]$OutputDir
    )
    
    if ($TargetTriple -like "*windows*") {
        # Windows batch installer
        $batchContent = @'
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
'@
        $batchContent | Out-File -FilePath "$OutputDir/install.bat" -Encoding ASCII
        
        # PowerShell installer
        $psContent = @'
# Eryzaa Windows Installer
Write-Host "Installing Eryzaa on Windows..." -ForegroundColor Green

# Check for Chocolatey
if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Chocolatey..." -ForegroundColor Yellow
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
}

Write-Host "You can install Docker and ZeroTier using:" -ForegroundColor Cyan
Write-Host "choco install docker-desktop zerotier-one" -ForegroundColor White
Write-Host ""
Write-Host "Or install manually from:" -ForegroundColor Cyan
Write-Host "- https://www.docker.com/products/docker-desktop" -ForegroundColor White
Write-Host "- https://www.zerotier.com/download/" -ForegroundColor White
Write-Host ""
Write-Host "After installation, run:" -ForegroundColor Cyan
Write-Host "- eryzaa-rental.exe to share your computer" -ForegroundColor White
Write-Host "- eryzaa-client.exe to access other computers" -ForegroundColor White
'@
        $psContent | Out-File -FilePath "$OutputDir/install.ps1" -Encoding UTF8
    }
}

function New-Archives {
    Write-Log "Creating distribution archives..."
    
    Push-Location "dist"
    
    try {
        Get-ChildItem -Directory | ForEach-Object {
            $target = $_.Name
            Write-Log "Creating archive for $target..."
            
            if ($target -like "*windows*") {
                # Create ZIP for Windows
                Compress-Archive -Path "$target/*" -DestinationPath "eryzaa-$target.zip" -Force
            } else {
                # Create tar.gz for Unix systems (requires tar command)
                if (Test-Command "tar") {
                    tar -czf "eryzaa-$target.tar.gz" "$target/"
                } else {
                    # Fallback to ZIP
                    Compress-Archive -Path "$target/*" -DestinationPath "eryzaa-$target.zip" -Force
                }
            }
        }
    } finally {
        Pop-Location
    }
    
    Write-Log "Archives created in dist/ directory"
}

function Show-Help {
    Write-Host @"
Usage: .\build.ps1 [OPTIONS]

Options:
  -All                 Build for all supported targets
  -Target TARGET       Build for specific target(s)
  -Package            Create distribution packages
  -Help               Show this help

Supported targets:
  x86_64-pc-windows-msvc        (Windows x64 MSVC)
  x86_64-pc-windows-gnu         (Windows x64 GNU)
  x86_64-unknown-linux-gnu      (Linux x64)
  aarch64-unknown-linux-gnu     (Linux ARM64)
  x86_64-apple-darwin           (macOS Intel)
  aarch64-apple-darwin          (macOS Apple Silicon)

Examples:
  .\build.ps1                                    # Build for current platform
  .\build.ps1 -All -Package                      # Build for all platforms and package
  .\build.ps1 -Target x86_64-pc-windows-msvc     # Build for specific target
"@
}

function Main {
    if ($Help) {
        Show-Help
        return
    }
    
    $targets = @()
    
    # Set default targets if none specified
    if ($Target.Count -eq 0 -and -not $All) {
        # Build for current platform by default
        $currentTarget = rustc -vV | Select-String "host" | ForEach-Object { ($_ -split ' ')[1] }
        $targets = @($currentTarget)
    }
    
    if ($All) {
        $targets = @(
            "x86_64-pc-windows-msvc",
            "x86_64-pc-windows-gnu",
            "x86_64-unknown-linux-gnu",
            "aarch64-unknown-linux-gnu",
            "x86_64-apple-darwin",
            "aarch64-apple-darwin"
        )
    } elseif ($Target.Count -gt 0) {
        $targets = $Target
    }
    
    Write-Log "Starting Eryzaa cross-platform build"
    Write-Log "Targets: $($targets -join ', ')"
    
    # Setup
    Install-Rust
    Add-Targets
    Install-CrossTools
    
    # Clean previous builds
    if (Test-Path "dist") {
        Remove-Item -Recurse -Force "dist"
    }
    New-Item -ItemType Directory -Path "dist" -Force | Out-Null
    
    # Build each target
    foreach ($target in $targets) {
        Write-Log "Building for target: $target"
        
        try {
            # Build GUI applications
            Build-Target $target "gui-client" "GUI Client"
            Build-Target $target "gui-rental" "GUI Rental Server"
            
            # Build CLI client
            Build-Target $target "client" "CLI Client"
            
            # Package builds if requested
            if ($Package) {
                New-Package $target "dist/$target"
            }
        } catch {
            Write-Error "Failed to build for target: $target"
            Write-Error $_.Exception.Message
            continue
        }
    }
    
    # Create archives if packaging
    if ($Package) {
        New-Archives
    }
    
    Write-Log "Build complete!"
    Write-Log "Built targets: $($targets -join ', ')"
    
    if ($Package) {
        Write-Log "Distribution packages available in dist/ directory"
        Get-ChildItem "dist" | Format-Table Name, Length, LastWriteTime
    }
}

# Run main function
Main
