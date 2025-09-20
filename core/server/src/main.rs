use std::process::{Command, Stdio};
use std::thread;
use std::time::Duration;
use std::env;

fn main() {
    println!("=== Rental Server Application ===");
    println!("Running inside Docker container with Ubuntu");
    
    // Display system information
    display_system_info();
    
    // Check ZeroTier status
    check_zerotier_status();
    
    // Check SSH service
    check_ssh_status();
    
    // Check GPU access
    check_gpu_access();
    
    // Display container info
    display_container_info();
    
    println!("[+] Rental server is ready!");
    println!("[*] Monitoring services...");
    
    // Keep the application running and monitor services
    loop {
        thread::sleep(Duration::from_secs(30));
        
        // Periodic health checks
        if !is_zerotier_running() {
            println!("[!] ZeroTier service is down, attempting restart...");
            restart_zerotier();
        }
        
        if !is_ssh_running() {
            println!("[!] SSH service is down, attempting restart...");
            restart_ssh();
        }
    }
}

fn display_system_info() {
    println!("
=== System Information ===");
    
    // OS Info
    if let Ok(output) = Command::new("uname").arg("-a").output() {
        println!("OS: {}", String::from_utf8_lossy(&output.stdout).trim());
    }
    
    // CPU Info
    if let Ok(output) = Command::new("nproc").output() {
        println!("CPU Cores: {}", String::from_utf8_lossy(&output.stdout).trim());
    }
    
    // Memory Info
    if let Ok(output) = Command::new("free").args(&["-h"]).output() {
        let output_str = String::from_utf8_lossy(&output.stdout);
        let lines: Vec<&str> = output_str.lines().collect();
        if lines.len() > 1 {
            println!("Memory: {}", lines[1]);
        }
    }
    
    // Disk Space
    if let Ok(output) = Command::new("df").args(&["-h", "/"]).output() {
        let output_str = String::from_utf8_lossy(&output.stdout);
        let lines: Vec<&str> = output_str.lines().collect();
        if lines.len() > 1 {
            println!("Disk: {}", lines[1]);
        }
    }
}

fn check_zerotier_status() {
    println!("
=== ZeroTier Status ===");
    
    // Check if ZeroTier is running
    if is_zerotier_running() {
        println!("[+] ZeroTier service is running");
        
        // Get network status
        if let Ok(output) = Command::new("zerotier-cli").arg("listnetworks").output() {
            println!("Networks:");
            println!("{}", String::from_utf8_lossy(&output.stdout));
        }
        
        // Get node info
        if let Ok(output) = Command::new("zerotier-cli").arg("info").output() {
            println!("Node Info: {}", String::from_utf8_lossy(&output.stdout).trim());
        }
    } else {
        println!("[-] ZeroTier service is not running");
    }
}

fn check_ssh_status() {
    println!("
=== SSH Status ===");
    
    if is_ssh_running() {
        println!("[+] SSH service is running");
        println!("    Connect with: ssh rental@<zerotier_ip>");
        println!("    Root access: ssh root@<zerotier_ip>");
    } else {
        println!("[-] SSH service is not running");
    }
}

fn check_gpu_access() {
    println!("
=== GPU Status ===");
    
    // Check for NVIDIA GPU
    if let Ok(output) = Command::new("nvidia-smi").output() {
        if output.status.success() {
            println!("[+] NVIDIA GPU detected");
            let gpu_info = String::from_utf8_lossy(&output.stdout);
            // Extract GPU name from nvidia-smi output
            for line in gpu_info.lines() {
                if line.contains("GeForce") || line.contains("RTX") || line.contains("GTX") || line.contains("Tesla") {
                    println!("    {}", line.trim());
                    break;
                }
            }
        } else {
            println!("[-] No NVIDIA GPU detected or driver not available");
        }
    } else {
        println!("[-] nvidia-smi not available");
    }
    
    // Check CUDA
    if let Ok(output) = Command::new("nvcc").arg("--version").output() {
        if output.status.success() {
            let cuda_info = String::from_utf8_lossy(&output.stdout);
            for line in cuda_info.lines() {
                if line.contains("release") {
                    println!("[+] CUDA: {}", line.trim());
                    break;
                }
            }
        }
    }
}

fn display_container_info() {
    println!("
=== Container Information ===");
    
    // Display environment variables
    if let Ok(network_id) = env::var("ZEROTIER_NETWORK_ID") {
        println!("ZeroTier Network ID: {}", network_id);
    }
    
    // Display workspace info
    println!("Workspace: /workspace");
    println!("Shared folder: /workspace/shared");
    println!("Data folder: /workspace/data");
    
    // Display available tools
    println!("
Available Tools:");
    let tools = vec!["python3", "pip3", "node", "npm", "git", "vim", "nano", "htop"];
    for tool in tools {
        if Command::new("which").arg(tool).output().map(|o| o.status.success()).unwrap_or(false) {
            println!("  ✓ {}", tool);
        }
    }
}

fn is_zerotier_running() -> bool {
    Command::new("pgrep")
        .arg("zerotier-one")
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

fn is_ssh_running() -> bool {
    Command::new("pgrep")
        .arg("sshd")
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

fn restart_zerotier() {
    let _ = Command::new("zerotier-one").arg("-d").status();
    thread::sleep(Duration::from_secs(3));
    
    if let Ok(network_id) = env::var("ZEROTIER_NETWORK_ID") {
        let _ = Command::new("zerotier-cli").args(&["join", &network_id]).status();
    }
}

fn restart_ssh() {
    let _ = Command::new("service").args(&["ssh", "restart"]).status();
}

// Restart the application
fn restart_application() {
    let current_exe = env::current_exe().expect("Failed to get current executable path");
    
    #[cfg(target_os = "windows")]
    {
        let _ = Command::new("powershell")
            .args(&[
                "-Command", 
                &format!("Start-Sleep -Seconds 2; Start-Process -FilePath '{}' -ArgumentList '--restart'", current_exe.display())
            ])
            .spawn();
    }

    #[cfg(target_os = "linux")]
    {
        let _ = Command::new("sh")
            .args(&[
                "-c", 
                &format!("sleep 2 && '{}' --restart &", current_exe.display())
            ])
            .spawn();
    }

    println!("Restarting in 2 seconds...");
    std::process::exit(0);
}

// Check if ZeroTier is installed
fn is_zerotier_installed() -> bool {
    // First check if zerotier-cli is available in PATH
    if Command::new("zerotier-cli")
        .arg("-v")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .is_ok() {
        return true;
    }
    
    // On Windows, also check common installation paths
    #[cfg(target_os = "windows")]
    {
        let common_paths = [
            "C:\\Program Files (x86)\\ZeroTier\\One\\zerotier-cli.exe",
            "C:\\Program Files\\ZeroTier\\One\\zerotier-cli.exe",
        ];
        
        for path in &common_paths {
            if Command::new(path)
                .arg("-v")
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .status()
                .is_ok() {
                return true;
            }
        }
        
        // Check if ZeroTier service exists
        let service_check = Command::new("powershell")
            .args(&["-Command", "Get-Service -Name 'ZeroTierOneService' -ErrorAction SilentlyContinue"])
            .output();
            
        if let Ok(output) = service_check {
            return !output.stdout.is_empty();
        }
    }
    
    false
}

// Detect Linux distribution
fn detect_linux_distro() -> String {
    // Try to read /etc/os-release
    if let Ok(content) = std::fs::read_to_string("/etc/os-release") {
        for line in content.lines() {
            if line.starts_with("ID=") {
                let id = line.trim_start_matches("ID=").trim_matches('"');
                return id.to_lowercase();
            }
        }
    }
    
    // Fallback: try other methods
    if std::path::Path::new("/etc/arch-release").exists() {
        return "arch".to_string();
    }
    if std::path::Path::new("/etc/debian_version").exists() {
        return "debian".to_string();
    }
    if std::path::Path::new("/etc/fedora-release").exists() {
        return "fedora".to_string();
    }
    
    "unknown".to_string()
}

// ...existing code...

// Install ZeroTier
fn install_zerotier() {
    #[cfg(target_os = "windows")]
    {
        println!("Installing ZeroTier using PowerShell...");
        
        // Try using winget first (modern Windows package manager)
        println!("Attempting installation via winget...");
        let winget_status = Command::new("winget")
            .args(&["install", "--id", "ZeroTier.ZeroTierOne", "--silent", "--accept-package-agreements"])
            .status();

        if winget_status.is_ok() && winget_status.unwrap().success() {
            println!("ZeroTier installed successfully via winget!");
            return;
        }

        println!("Winget failed, trying Chocolatey...");
        
        // Try Chocolatey
        let choco_status = Command::new("powershell")
            .args(&["-ExecutionPolicy", "Bypass", "-Command", "choco install zerotier-one -y"])
            .status();

        if choco_status.is_ok() && choco_status.unwrap().success() {
            println!("ZeroTier installed successfully via Chocolatey!");
            return;
        }

        println!("Chocolatey failed, trying direct MSI installation...");
        
        // Fallback to direct MSI installation
        let install_cmd = r#"
            $url = 'https://download.zerotier.com/dist/ZeroTier One.msi'
            $output = 'ZeroTier-One.msi'
            
            Write-Host 'Downloading ZeroTier...'
            try {
                Invoke-WebRequest -Uri $url -OutFile $output -UseBasicParsing
                Write-Host 'Download completed'
            } catch {
                Write-Host 'Download failed:' $_.Exception.Message
                exit 1
            }
            
            Write-Host 'Installing ZeroTier...'
            try {
                $proc = Start-Process -FilePath 'msiexec.exe' -ArgumentList "/i $output /quiet /norestart" -Wait -PassThru -NoNewWindow
                Write-Host "MSI installer exit code: $($proc.ExitCode)"
                
                if ($proc.ExitCode -eq 0) {
                    Write-Host 'Installation successful'
                    Start-Sleep -Seconds 5
                    
                    Write-Host 'Starting ZeroTier service...'
                    try {
                        Start-Service -Name 'ZeroTierOneService' -ErrorAction Stop
                        Write-Host 'Service started successfully'
                    } catch {
                        Write-Host 'Service start failed:' $_.Exception.Message
                    }
                } else {
                    Write-Host 'Installation failed with exit code:' $proc.ExitCode
                }
            } catch {
                Write-Host 'Installation failed:' $_.Exception.Message
            }
            
            Write-Host 'Cleaning up...'
            Remove-Item -Path $output -Force -ErrorAction SilentlyContinue
        "#;
        
        let install_status = Command::new("powershell")
            .args(&["-ExecutionPolicy", "Bypass", "-Command", install_cmd])
            .status();

        match install_status {
            Ok(status) if status.success() => {
                println!("ZeroTier installation completed!");
            }
            Ok(_) => {
                println!("ZeroTier installation may have failed. Please try running as administrator.");
            }
            Err(e) => {
                println!("Failed to run installation command: {}", e);
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        println!("Installing ZeroTier for Linux...");
        
        // Detect the Linux distribution
        let distro = detect_linux_distro();
        println!("Detected distribution: {}", distro);
        
        let install_status = match distro.as_str() {
            "arch" | "manjaro" | "endeavouros" => {
                println!("Installing via pacman...");
                Command::new("sudo")
                    .args(&["pacman", "-S", "--noconfirm", "zerotier-one"])
                    .status()
            },
            "ubuntu" | "debian" | "mint" | "kali" => {
                println!("Installing via apt...");
                let _ = Command::new("sudo")
                    .args(&["apt", "update"])
                    .status();
                Command::new("sudo")
                    .args(&["apt", "install", "-y", "zerotier-one"])
                    .status()
            },
            "fedora" | "centos" | "rhel" => {
                println!("Installing via dnf/yum...");
                Command::new("sudo")
                    .args(&["dnf", "install", "-y", "zerotier-one"])
                    .status()
                    .or_else(|_| Command::new("sudo")
                        .args(&["yum", "install", "-y", "zerotier-one"])
                        .status())
            },
            _ => {
                println!("Using official installation script for {}", distro);
                
                // First, try to install curl if not available
                let curl_check = Command::new("which")
                    .arg("curl")
                    .output();
                
                if curl_check.is_err() || !curl_check.unwrap().status.success() {
                    println!("Installing curl first...");
                    let _ = Command::new("sudo")
                        .args(&["apt", "update"])
                        .status();
                    let _ = Command::new("sudo")
                        .args(&["apt", "install", "-y", "curl"])
                        .status();
                }
                
                // Use the official ZeroTier installation script
                Command::new("bash")
                    .args(&["-c", "curl -s https://install.zerotier.com | sudo bash"])
                    .status()
            }
        };

        match install_status {
            Ok(status) if status.success() => {
                println!("ZeroTier installed successfully!");
                
                // Start and enable the service
                let _ = Command::new("sudo")
                    .args(&["systemctl", "enable", "zerotier-one"])
                    .status();
                let _ = Command::new("sudo")
                    .args(&["systemctl", "start", "zerotier-one"])
                    .status();
                    
                println!("ZeroTier service started and enabled.");
            }
            Ok(_) => {
                println!("ZeroTier installation may have failed. Please install manually:");
                println!("For Arch Linux: sudo pacman -S zerotier-one");
                println!("For others: curl -s https://install.zerotier.com | sudo bash");
            }
            Err(e) => {
                println!("Failed to run installation command: {}", e);
                println!("Please install ZeroTier manually:");
                println!("For Arch Linux: sudo pacman -S zerotier-one");
                println!("For others: curl -s https://install.zerotier.com | sudo bash");
            }
        }
    }
}


// Get the ZeroTier CLI command path
fn get_zerotier_cli_path() -> String {
    // First try the default command
    if Command::new("zerotier-cli")
        .arg("-v")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .is_ok() {
        return "zerotier-cli".to_string();
    }
    
    // On Windows, check common installation paths
    #[cfg(target_os = "windows")]
    {
        let common_paths = [
            "C:\\ProgramData\\ZeroTier\\One\\zerotier-one_x64.exe",
            "C:\\ProgramData\\ZeroTier\\One\\zerotier-one.exe",
            "C:\\Program Files (x86)\\ZeroTier\\One\\zerotier-cli.bat",
            "C:\\Program Files\\ZeroTier\\One\\zerotier-cli.bat",
            "C:\\Program Files (x86)\\ZeroTier\\One\\zerotier-cli.exe",
            "C:\\Program Files\\ZeroTier\\One\\zerotier-cli.exe",
        ];
        
        for path in &common_paths {
            if std::path::Path::new(path).exists() {
                // For .exe files, test with -v argument
                if path.ends_with(".exe") {
                    if Command::new(path)
                        .arg("-v")
                        .stdout(Stdio::null())
                        .stderr(Stdio::null())
                        .status()
                        .is_ok() {
                        return path.to_string();
                    }
                } else {
                    // For .bat files, just check if they exist and return them
                    return path.to_string();
                }
            }
        }
        
        // Try to find via PowerShell - look for both exe and bat files
        let ps_find = Command::new("powershell")
            .args(&["-Command", "Get-ChildItem -Path 'C:\\Program*', 'C:\\ProgramData*' -Recurse -Name 'zerotier-cli.*', 'zerotier-one*.exe' -ErrorAction SilentlyContinue | Select-Object -First 3"])
            .output();
            
        if let Ok(output) = ps_find {
            let found_output = String::from_utf8_lossy(&output.stdout);
            for found_path in found_output.lines() {
                let found_path = found_path.trim();
                if !found_path.is_empty() {
                    // Try different base paths
                    let possible_paths = [
                        format!("C:\\Program Files\\{}", found_path),
                        format!("C:\\Program Files (x86)\\{}", found_path),
                        format!("C:\\ProgramData\\{}", found_path),
                    ];
                    
                    for full_path in &possible_paths {
                        if std::path::Path::new(full_path).exists() {
                            return full_path.clone();
                        }
                    }
                }
            }
        }
    }
    
    // Fallback to default
    "zerotier-cli".to_string()
}

// Join ZeroTier network
fn join_network(network_id: &str) {
    let cli_path = get_zerotier_cli_path();
    
    println!("Using ZeroTier CLI at: {}", cli_path);
    
    let mut cmd = Command::new(&cli_path);
    
    // If using the direct exe, add -q flag first
    if cli_path.contains("zerotier-one") && cli_path.ends_with(".exe") {
        cmd.arg("-q");
    }
    
    let status = cmd
        .arg("join")
        .arg(network_id)
        .status();

    match status {
        Ok(exit_status) if exit_status.success() => {
            println!("Joined ZeroTier network {}", network_id);
        }
        Ok(_) => {
            println!("Failed to join network (command executed but failed).");
        }
        Err(e) => {
            println!("Failed to execute ZeroTier CLI: {}. CLI path: {}", e, cli_path);
            println!("Please ensure ZeroTier is properly installed and try running as administrator.");
        }
    }
}

// Get ZeroTier IP
fn get_zt_ip() -> Option<String> {
    let cli_path = get_zerotier_cli_path();
    
    let mut cmd = Command::new(&cli_path);
    
    // If using the direct exe, add -q flag first
    if cli_path.contains("zerotier-one") && cli_path.ends_with(".exe") {
        cmd.arg("-q");
    }
    
    let output = cmd
        .arg("listnetworks")
        .output();

    match output {
        Ok(output) => {
            let s = str::from_utf8(&output.stdout).unwrap();
            for line in s.lines() {
                if line.contains("OK") {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if parts.len() >= 9 {
                        return Some(parts[8].to_string());
                    }
                }
            }
            None
        }
        Err(e) => {
            println!("Failed to list ZeroTier networks: {}. CLI path: {}", e, cli_path);
            None
        }
    }
}

// Start SSH server
fn start_ssh_server() {
    #[cfg(target_os = "windows")]
    {
        println!("Configuring SSH server for remote access...");
        
        // Start SSH service first
        println!("Starting SSH service...");
        let _ = Command::new("powershell")
            .args(&["-Command", "Start-Service sshd -ErrorAction SilentlyContinue"])
            .status();
        let _ = Command::new("powershell")
            .args(&["-Command", "Set-Service -Name sshd -StartupType 'Automatic' -ErrorAction SilentlyContinue"])
            .status();
        
        // Configure Windows Firewall - create comprehensive rules
        println!("Configuring Windows Firewall for SSH...");
        let _ = Command::new("powershell")
            .args(&["-Command", "Remove-NetFirewallRule -DisplayName 'OpenSSH*' -ErrorAction SilentlyContinue"])
            .status();
        let _ = Command::new("powershell")
            .args(&["-Command", "New-NetFirewallRule -DisplayName 'OpenSSH-Server-In-TCP' -Direction Inbound -Protocol TCP -LocalPort 22 -Action Allow -Profile Any -ErrorAction SilentlyContinue"])
            .status();
        let _ = Command::new("powershell")
            .args(&["-Command", "New-NetFirewallRule -DisplayName 'SSH-Remote-Access' -Direction Inbound -Protocol TCP -LocalPort 22 -Action Allow -RemoteAddress Any -ErrorAction SilentlyContinue"])
            .status();
        
        // Disable Windows Defender Firewall temporarily for testing (can be re-enabled manually)
        println!("Temporarily disabling Windows Firewall for SSH testing...");
        let _ = Command::new("powershell")
            .args(&["-Command", "Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False -ErrorAction SilentlyContinue"])
            .status();
        
        thread::sleep(Duration::from_secs(2));
        
        // Check if SSH service is running
        let service_status = Command::new("powershell")
            .args(&["-Command", "Get-Service -Name sshd -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Status"])
            .output();
        
        let mut ssh_running = false;
        if let Ok(output) = service_status {
            let status_str = String::from_utf8_lossy(&output.stdout);
            let status = status_str.trim();
            if status == "Running" {
                ssh_running = true;
                println!("✓ SSH service is running");
            } else {
                println!("⚠ SSH service status: {}", status);
            }
        }
        
        // Get ZeroTier IP
        let zt_ip = Command::new("powershell")
            .args(&["-Command", "(Get-NetIPAddress | Where-Object {$_.InterfaceAlias -match 'ZeroTier'} | Where-Object {$_.AddressFamily -eq 'IPv4'}).IPAddress"])
            .output();
        
        let username = Command::new("powershell")
            .args(&["-Command", "$env:USERNAME"])
            .output();
        
        if let (Ok(ip_output), Ok(user_output)) = (zt_ip, username) {
            let ip_str = String::from_utf8_lossy(&ip_output.stdout);
            let ip = ip_str.trim();
            let user_str = String::from_utf8_lossy(&user_output.stdout);
            let user = user_str.trim();
            
            if !ip.is_empty() && !user.is_empty() {
                println!("ZeroTier IP: {}", ip);
                println!("SSH Connection: ssh {}@{}", user, ip);
                
                if ssh_running {
                    println!("✓ SSH server configured for remote access");
                    println!("⚠ Windows Firewall temporarily disabled for testing");
                    println!("  You can re-enable it with: Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled True");
                } else {
                    println!("⚠ SSH service not running properly. Try restarting as Administrator");
                }
            } else {
                println!("⚠ Could not determine ZeroTier IP or username");
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        println!("Configuring SSH server for Linux...");
        
        // Install SSH server if not present
        let ssh_check = Command::new("which")
            .arg("sshd")
            .output();
        
        if ssh_check.is_err() || !ssh_check.unwrap().status.success() {
            println!("Installing SSH server...");
            
            let distro = detect_linux_distro();
            match distro.as_str() {
                "arch" | "manjaro" | "endeavouros" => {
                    println!("Installing openssh via pacman...");
                    let _ = Command::new("sudo")
                        .args(&["pacman", "-S", "--noconfirm", "openssh"])
                        .status();
                },
                "ubuntu" | "debian" | "mint" | "kali" => {
                    println!("Installing openssh-server via apt...");
                    let apt_status = Command::new("sudo")
                        .args(&["apt", "update"])
                        .status();
                    if apt_status.is_ok() && apt_status.unwrap().success() {
                        let _ = Command::new("sudo")
                            .args(&["apt", "install", "-y", "openssh-server"])
                            .status();
                    }
                },
                "fedora" | "centos" | "rhel" => {
                    println!("Installing openssh-server via dnf/yum...");
                    let _ = Command::new("sudo")
                        .args(&["dnf", "install", "-y", "openssh-server"])
                        .status()
                        .or_else(|_| Command::new("sudo")
                            .args(&["yum", "install", "-y", "openssh-server"])
                            .status());
                },
                _ => {
                    println!("Trying default package managers...");
                    // Try apt first
                    let apt_status = Command::new("sudo")
                        .args(&["apt", "update"])
                        .status();
                    if apt_status.is_ok() && apt_status.unwrap().success() {
                        let _ = Command::new("sudo")
                            .args(&["apt", "install", "-y", "openssh-server"])
                            .status();
                    } else {
                        // Try yum/dnf
                        let _ = Command::new("sudo")
                            .args(&["yum", "install", "-y", "openssh-server"])
                            .status();
                        let _ = Command::new("sudo")
                            .args(&["dnf", "install", "-y", "openssh-server"])
                            .status();
                    }
                }
            }
        }
        
        // Enable and start SSH service
        let _ = Command::new("sudo")
            .args(&["systemctl", "enable", "ssh"])
            .status();
        let _ = Command::new("sudo")
            .args(&["systemctl", "start", "ssh"])
            .status();
        
        // Also try sshd (different distributions use different service names)
        let _ = Command::new("sudo")
            .args(&["systemctl", "enable", "sshd"])
            .status();
        let _ = Command::new("sudo")
            .args(&["systemctl", "start", "sshd"])
            .status();
        
        // Configure firewall if ufw is available
        let ufw_check = Command::new("which")
            .arg("ufw")
            .output();
        
        if ufw_check.is_ok() && ufw_check.unwrap().status.success() {
            println!("Configuring UFW firewall for SSH...");
            let _ = Command::new("sudo")
                .args(&["ufw", "allow", "ssh"])
                .status();
        }
        
        // Get current user
        let current_user = Command::new("whoami")
            .output();
        
        // Get ZeroTier IP
        let zt_ip_cmd = Command::new("ip")
            .args(&["addr", "show"])
            .output();
        
        if let (Ok(user_output), Ok(ip_output)) = (current_user, zt_ip_cmd) {
            let user_str = String::from_utf8_lossy(&user_output.stdout);
            let user = user_str.trim();
            
            let ip_str = String::from_utf8_lossy(&ip_output.stdout);
            
            // Extract ZeroTier IP (usually starts with zt interface)
            for line in ip_str.lines() {
                if line.contains("zt") && line.contains("inet ") {
                    if let Some(ip_part) = line.split("inet ").nth(1) {
                        if let Some(ip) = ip_part.split('/').next() {
                            let ip = ip.trim();
                            if !ip.is_empty() {
                                println!("ZeroTier IP: {}", ip);
                                println!("SSH Connection: ssh {}@{}", user, ip);
                                break;
                            }
                        }
                    }
                }
            }
        }
        
        // Check SSH service status
        let service_status = Command::new("systemctl")
            .args(&["is-active", "ssh"])
            .output();
        
        let service_active = if let Ok(output) = service_status {
            String::from_utf8_lossy(&output.stdout).trim() == "active"
        } else {
            // Try sshd if ssh didn't work
            let sshd_status = Command::new("systemctl")
                .args(&["is-active", "sshd"])
                .output();
            if let Ok(output) = sshd_status {
                String::from_utf8_lossy(&output.stdout).trim() == "active"
            } else {
                false
            }
        };
        
        if service_active {
            println!("✓ SSH server is running and configured for remote access");
        } else {
            println!("⚠ SSH service may not be running properly");
        }
    }
}