use std::io::{self, Write};
use std::process::Command;
use std::fs::{File, create_dir_all};
use std::path::Path;
use std::thread;
use std::time::Duration;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("=== Docker-based Rental Server Client ===");
    
    // === Step 1: Check and install Docker ===
    if !is_docker_installed() {
        println!("[*] Docker is not installed. Installing Docker...");
        install_docker()?;
    } else {
        println!("[+] Docker is installed!");
    }
    
    // === Step 2: Check Docker service ===
    if !is_docker_running() {
        println!("[*] Starting Docker service...");
        start_docker_service()?;
    }
    
    // === Step 3: Check and install Docker Compose ===
    if !is_docker_compose_installed() {
        println!("[*] Docker Compose is not installed. Installing Docker Compose...");
        install_docker_compose()?;
    } else {
        println!("[+] Docker Compose is installed!");
    }
    
    // === Step 4: Check for NVIDIA Docker support (optional) ===
    let gpu_support = check_nvidia_gpu();
    if gpu_support {
        println!("[+] NVIDIA GPU detected!");
        print!("Install NVIDIA Docker support for GPU access? (y/N): ");
        io::stdout().flush()?;
        let mut input = String::new();
        io::stdin().read_line(&mut input)?;
        
        if input.trim().to_lowercase() == "y" {
            install_nvidia_docker()?;
        }
    }
    
    // === Step 5: Deploy the rental server container ===
    deploy_rental_server()?;
    
    // === Step 6: Wait for container to be ready ===
    println!("[*] Waiting for rental server to be ready...");
    thread::sleep(Duration::from_secs(15));
    
    // === Step 7: Get ZeroTier IP and connect ===
    if let Some(zt_ip) = get_container_zerotier_ip() {
        println!("[+] Rental server ZeroTier IP: {}", zt_ip);
        println!("[*] You can now connect via SSH:");
        println!("    ssh rental@{}", zt_ip);
        println!("    ssh root@{} (password: rental_access_2024)", zt_ip);
        
        // Ask if user wants to connect now
        print!("Connect via SSH now? (y/n): ");
        io::stdout().flush()?;
        let mut input = String::new();
        io::stdin().read_line(&mut input)?;
        
        if input.trim().to_lowercase() == "y" {
            connect_to_server(&zt_ip)?;
        }
    } else {
        println!("[!] Could not get ZeroTier IP. The container might need more time to join the network.");
        println!("[*] You can check the container logs with: docker-compose logs rental-server");
        println!("[*] Or try: docker exec rental-server zerotier-cli listnetworks");
    }
    
    Ok(())
}

// Check if Docker is installed
fn is_docker_installed() -> bool {
    Command::new("docker")
        .arg("--version")
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

// Check if Docker is running
fn is_docker_running() -> bool {
    Command::new("docker")
        .arg("info")
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

// Check if Docker Compose is installed
fn is_docker_compose_installed() -> bool {
    Command::new("docker-compose")
        .arg("--version")
        .output()
        .map(|output| output.status.success())
        .unwrap_or_else(|_| {
            // Try docker compose (newer syntax)
            Command::new("docker")
                .args(&["compose", "--version"])
                .output()
                .map(|output| output.status.success())
                .unwrap_or(false)
        })
}

// Detect Linux distribution
fn detect_linux_distro() -> String {
    if let Ok(content) = std::fs::read_to_string("/etc/os-release") {
        for line in content.lines() {
            if line.starts_with("ID=") {
                let id = line.trim_start_matches("ID=").trim_matches('"');
                return id.to_lowercase();
            }
        }
    }
    
    if Path::new("/etc/arch-release").exists() {
        return "arch".to_string();
    }
    if Path::new("/etc/debian_version").exists() {
        return "debian".to_string();
    }
    if Path::new("/etc/fedora-release").exists() {
        return "fedora".to_string();
    }
    
    "unknown".to_string()
}

// Install Docker
fn install_docker() -> Result<(), Box<dyn std::error::Error>> {
    println!("[*] Installing Docker...");
    let distro = detect_linux_distro();
    println!("[*] Detected distribution: {}", distro);
    
    match distro.as_str() {
        "ubuntu" | "debian" | "mint" | "kali" => {
            println!("[*] Installing Docker on {}...", distro);
            
            // Update package index
            Command::new("sudo").args(&["apt-get", "update"]).status()?;
            
            // Install prerequisites
            Command::new("sudo")
                .args(&["apt-get", "install", "-y", 
                       "apt-transport-https", "ca-certificates", "curl", "gnupg", "lsb-release"])
                .status()?;
            
            // Install Docker using convenience script
            let status = Command::new("bash")
                .args(&["-c", "curl -fsSL https://get.docker.com | sudo bash"])
                .status()?;
            
            if !status.success() {
                return Err("Failed to install Docker".into());
            }
        },
        "arch" | "manjaro" | "endeavouros" => {
            println!("[*] Installing Docker on Arch Linux...");
            Command::new("sudo")
                .args(&["pacman", "-Sy", "--noconfirm", "docker", "docker-compose"])
                .status()?;
        },
        "fedora" | "centos" | "rhel" => {
            println!("[*] Installing Docker on {}...", distro);
            Command::new("sudo")
                .args(&["dnf", "install", "-y", "dnf-plugins-core"])
                .status()?;
            
            let status = Command::new("bash")
                .args(&["-c", "curl -fsSL https://get.docker.com | sudo bash"])
                .status()?;
            
            if !status.success() {
                return Err("Failed to install Docker".into());
            }
        },
        _ => {
            println!("[*] Unknown distribution. Trying universal installation...");
            let status = Command::new("bash")
                .args(&["-c", "curl -fsSL https://get.docker.com | sudo bash"])
                .status()?;
            
            if !status.success() {
                return Err("Failed to install Docker".into());
            }
        }
    }
    
    // Start and enable Docker service
    let _ = Command::new("sudo").args(&["systemctl", "start", "docker"]).status();
    let _ = Command::new("sudo").args(&["systemctl", "enable", "docker"]).status();
    
    // Add current user to docker group
    if let Ok(user) = std::env::var("USER") {
        let _ = Command::new("sudo").args(&["usermod", "-aG", "docker", &user]).status();
    }
    
    println!("[+] Docker installed successfully!");
    println!("[!] You may need to log out and log back in for group changes to take effect.");
    
    Ok(())
}

// Start Docker service
fn start_docker_service() -> Result<(), Box<dyn std::error::Error>> {
    let status = Command::new("sudo")
        .args(&["systemctl", "start", "docker"])
        .status()?;
    
    if status.success() {
        println!("[+] Docker service started!");
        thread::sleep(Duration::from_secs(3));
    } else {
        return Err("Failed to start Docker service".into());
    }
    
    Ok(())
}

// Install Docker Compose
fn install_docker_compose() -> Result<(), Box<dyn std::error::Error>> {
    println!("[*] Installing Docker Compose...");
    let distro = detect_linux_distro();
    
    match distro.as_str() {
        "arch" | "manjaro" | "endeavouros" => {
            println!("[*] Docker Compose already installed with Docker package");
        },
        _ => {
            // Get latest version
            let output = Command::new("curl")
                .args(&["-s", "https://api.github.com/repos/docker/compose/releases/latest"])
                .output()?;
            
            let content = String::from_utf8_lossy(&output.stdout);
            let version = content
                .lines()
                .find(|line| line.contains("tag_name"))
                .and_then(|line| line.split('"').nth(3))
                .unwrap_or("v2.20.0");
            
            let url = format!(
                "https://github.com/docker/compose/releases/download/{}/docker-compose-{}-{}",
                version,
                std::env::consts::OS,
                std::env::consts::ARCH
            );
            
            // Download and install
            Command::new("sudo")
                .args(&["curl", "-L", &url, "-o", "/usr/local/bin/docker-compose"])
                .status()?;
            
            Command::new("sudo")
                .args(&["chmod", "+x", "/usr/local/bin/docker-compose"])
                .status()?;
            
            // Create symlink
            let _ = Command::new("sudo")
                .args(&["ln", "-sf", "/usr/local/bin/docker-compose", "/usr/bin/docker-compose"])
                .status();
        }
    }
    
    println!("[+] Docker Compose installed successfully!");
    Ok(())
}

// Check for NVIDIA GPU
fn check_nvidia_gpu() -> bool {
    Command::new("lspci")
        .output()
        .map(|output| {
            String::from_utf8_lossy(&output.stdout)
                .to_lowercase()
                .contains("nvidia")
        })
        .unwrap_or(false)
}

// Install NVIDIA Docker
fn install_nvidia_docker() -> Result<(), Box<dyn std::error::Error>> {
    println!("[*] Installing NVIDIA Docker support...");
    let distro = detect_linux_distro();
    
    match distro.as_str() {
        "ubuntu" | "debian" => {
            // Add NVIDIA Docker repository
            Command::new("bash")
                .args(&["-c", 
                       "distribution=$(. /etc/os-release;echo $ID$VERSION_ID) && \
                        curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add - && \
                        curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | \
                        sudo tee /etc/apt/sources.list.d/nvidia-docker.list"])
                .status()?;
            
            Command::new("sudo").args(&["apt-get", "update"]).status()?;
            Command::new("sudo").args(&["apt-get", "install", "-y", "nvidia-docker2"]).status()?;
            Command::new("sudo").args(&["systemctl", "restart", "docker"]).status()?;
        },
        "arch" | "manjaro" | "endeavouros" => {
            println!("[!] For Arch Linux, please install nvidia-docker manually using AUR:");
            println!("    yay -S nvidia-docker");
            println!("    or paru -S nvidia-docker");
        },
        _ => {
            println!("[!] NVIDIA Docker installation not automated for {}.", distro);
            println!("    Please install manually from: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html");
        }
    }
    
    println!("[+] NVIDIA Docker setup completed!");
    Ok(())
}

// Check for NVIDIA Docker support
fn check_nvidia_docker() -> bool {
    Command::new("docker")
        .args(&["run", "--rm", "--gpus", "all", "nvidia/cuda:12.2-base-ubuntu22.04", "nvidia-smi"])
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

// Deploy the rental server container
fn deploy_rental_server() -> Result<(), Box<dyn std::error::Error>> {
    println!("[*] Deploying rental server container...");
    
    // Create workspace directory if it doesn't exist
    let workspace_path = "./workspace";
    if !Path::new(workspace_path).exists() {
        create_dir_all(workspace_path)?;
        println!("[+] Created workspace directory");
    }
    
    // Stop existing container if running
    let _ = Command::new("docker-compose")
        .args(&["down"])
        .status();
    
    // Build and start the container
    let status = Command::new("docker-compose")
        .args(&["up", "-d", "--build"])
        .status()?;
    
    if status.success() {
        println!("[+] Rental server container deployed successfully!");
    } else {
        return Err("Failed to deploy rental server container".into());
    }
    
    Ok(())
}

// Get ZeroTier IP from the container
fn get_container_zerotier_ip() -> Option<String> {
    // Wait for ZeroTier to get an IP
    for _ in 0..30 {
        let output = Command::new("docker")
            .args(&["exec", "rental-server", "zerotier-cli", "listnetworks"])
            .output();
        
        if let Ok(output) = output {
            let output_str = String::from_utf8_lossy(&output.stdout);
            for line in output_str.lines() {
                if line.contains("363c67c55ad2489d") {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if parts.len() > 8 {
                        let ip = parts[8];
                        if ip != "-" && ip.contains('.') {
                            return Some(ip.split('/').next().unwrap_or(ip).to_string());
                        }
                    }
                }
            }
        }
        
        thread::sleep(Duration::from_secs(2));
    }
    
    None
}

// Connect to the server via SSH
fn connect_to_server(ip: &str) -> Result<(), Box<dyn std::error::Error>> {
    println!("[*] Connecting to rental server...");
    
    let status = Command::new("ssh")
        .args(&["-o", "StrictHostKeyChecking=no", &format!("rental@{}", ip)])
        .status()?;
    
    if !status.success() {
        println!("[!] SSH connection failed. You can try manually:");
        println!("    ssh -o StrictHostKeyChecking=no rental@{}", ip);
    }
    
    Ok(())
}
