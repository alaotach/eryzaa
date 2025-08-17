use std::io::{self, Write};
use std::process::Command;
use std::fs::File;
use std::io::copy;
use reqwest::blocking::get;
use std::thread;
use std::time::Duration;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // === Step 1: Install ZeroTier if not installed ===
    if !is_zerotier_installed() {
        install_zerotier()?;
    } else {
        println!("[+] ZeroTier is already installed!");
    }

    // === Step 2: Join the same ZeroTier network ===
    let network_id = "363c67c55ad2489d";
    println!("[*] Joining ZeroTier network: {}", network_id);
    
    let join_result = if cfg!(target_os = "windows") {
        Command::new("zerotier-cli")
            .args(&["join", network_id])
            .status()
    } else {
        Command::new("sudo")
            .args(&["zerotier-cli", "join", network_id])
            .status()
    };

    match join_result {
        Ok(status) if status.success() => println!("[+] Joined ZeroTier network!"),
        Ok(_) => println!("[-] Failed to join ZeroTier network"),
        Err(e) => println!("[-] Error joining network: {}", e),
    }

    Ok(())
}

// Check if ZeroTier is installed
fn is_zerotier_installed() -> bool {
    Command::new("zerotier-cli")
        .arg("-v")
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

// Install ZeroTier based on the operating system
fn install_zerotier() -> Result<(), Box<dyn std::error::Error>> {
    #[cfg(target_os = "windows")]
    {
        println!("[*] Installing ZeroTier for Windows...");
        let url = "https://download.zerotier.com/dist/ZeroTier%20One.msi";
        let response = get(url)?;
        let mut out = File::create("ZeroTierOne.msi")?;
        let content = response.bytes()?;
        copy(&mut content.as_ref(), &mut out)?;

        let status = Command::new("msiexec")
            .args(&["/i", "ZeroTierOne.msi", "/quiet", "/norestart"])
            .status()?;

        if status.success() {
            println!("[+] ZeroTier installed! Waiting for service to start...");
            thread::sleep(Duration::from_secs(10));
        } else {
            return Err("Failed to install ZeroTier".into());
        }
    }

    #[cfg(target_os = "linux")]
    {
        println!("[*] Installing ZeroTier for Linux...");
        println!("[*] Using official installation script...");
        
        let status = Command::new("bash")
            .args(&["-c", "curl -s https://install.zerotier.com | sudo bash"])
            .status()?;

        if status.success() {
            println!("[+] ZeroTier installed! Waiting for service to start...");
            thread::sleep(Duration::from_secs(5));
        } else {
            return Err("Failed to install ZeroTier".into());
        }
    }

    #[cfg(not(any(target_os = "windows", target_os = "linux")))]
    {
        return Err("Unsupported operating system".into());
    }

    // === Step 3: Ask for host info ===
    print!("Enter SSH username: ");
    io::stdout().flush()?;
    let mut username = String::new();
    io::stdin().read_line(&mut username)?;
    let username = username.trim();

    print!("Enter host ZeroTier IP (e.g., 10.x.x.x): ");
    io::stdout().flush()?;
    let mut host_ip = String::new();
    io::stdin().read_line(&mut host_ip)?;
    let host_ip = host_ip.trim();

    // === Step 4: Start SSH session ===
    println!("[*] Connecting via SSH...");
    Command::new("ssh")
        .arg(format!("{}@{}", username, host_ip))
        .status()?;

    Ok(())
}
