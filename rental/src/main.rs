use std::process::Command;
use std::thread;
use std::time::Duration;
use std::io::{self, Write};

fn main() {
    println!("🏠 =======================================================");
    println!("🚀  ERYZA RENTAL SERVER CLI - v1.0.0");
    println!("🏠 =======================================================");
    
    // Interactive menu
    loop {
        show_main_menu();
        
        print!("\n💻 Select option (1-7): ");
        io::stdout().flush().unwrap();
        
        let mut input = String::new();
        io::stdin().read_line(&mut input).unwrap();
        
        match input.trim() {
            "1" => show_dashboard(),
            "2" => show_system_info(),
            "3" => show_network_status(),
            "4" => show_connection_info(),
            "5" => show_logs(),
            "6" => setup_services(),
            "7" => {
                println!("👋 Goodbye!");
                break;
            }
            _ => println!("❌ Invalid option. Please try again."),
        }
        
        println!("\n⏎ Press Enter to continue...");
        let mut _dummy = String::new();
        io::stdin().read_line(&mut _dummy).unwrap();
    }
}

fn show_main_menu() {
    println!("\n📋 =================== MAIN MENU ===================");
    println!("1. 📊 Dashboard & Status");
    println!("2. 🖥️  System Information");
    println!("3. 🌐 Network & ZeroTier Status");
    println!("4. 🔗 Connection Information");
    println!("5. 📜 View Logs");
    println!("6. ⚙️  Setup & Restart Services");
    println!("7. 🚪 Exit");
    println!("📋 =================================================");
}

fn show_dashboard() {
    println!("\n📊 =================== DASHBOARD ===================");
    
    // Server status
    let uptime = get_uptime();
    println!("⏰ Server Uptime: {} seconds", uptime);
    println!("📅 Current Time: {}", get_current_time());
    
    // Service status
    println!("\n🔧 Service Status:");
    let zt_status = if is_zerotier_running() { "🟢 Running" } else { "🔴 Stopped" };
    let ssh_status = if is_ssh_running() { "🟢 Running" } else { "🔴 Stopped" };
    println!("   🌐 ZeroTier: {}", zt_status);
    println!("   🔑 SSH:      {}", ssh_status);
    
    // Network info
    if let Some(ip) = get_zerotier_ip() {
        println!("   📡 ZT IP:    🟢 {}", ip);
    } else {
        println!("   📡 ZT IP:    🔴 Not assigned");
    }
    
    // Resource usage
    show_resource_usage();
    
    println!("📊 ===============================================");
}

fn show_system_info() {
    println!("\n🖥️ ================ SYSTEM INFO ================");
    
    // OS Info
    if let Ok(output) = Command::new("uname").arg("-a").output() {
        println!("🐧 OS: {}", String::from_utf8_lossy(&output.stdout).trim());
    }
    
    // CPU Info
    if let Ok(output) = Command::new("nproc").output() {
        println!("⚡ CPU Cores: {}", String::from_utf8_lossy(&output.stdout).trim());
    }
    
    if let Ok(output) = Command::new("cat").arg("/proc/cpuinfo").output() {
        let cpuinfo = String::from_utf8_lossy(&output.stdout);
        if let Some(model_line) = cpuinfo.lines().find(|line| line.starts_with("model name")) {
            if let Some(model) = model_line.split(':').nth(1) {
                println!("🔥 CPU Model: {}", model.trim());
            }
        }
    }
    
    // Memory Info
    if let Ok(output) = Command::new("free").arg("-h").output() {
        println!("💾 Memory:");
        for line in String::from_utf8_lossy(&output.stdout).lines().skip(1) {
            if line.starts_with("Mem:") {
                println!("   {}", line);
            }
        }
    }
    
    // Disk Space
    if let Ok(output) = Command::new("df").arg("-h").arg("/").output() {
        println!("💽 Disk Space:");
        for line in String::from_utf8_lossy(&output.stdout).lines().skip(1) {
            println!("   {}", line);
        }
    }
    
    // GPU Info
    show_gpu_info();
    
    println!("🖥️ ==========================================");
}

fn show_network_status() {
    println!("\n🌐 =============== NETWORK STATUS ===============");
    
    // ZeroTier Status
    println!("🔗 ZeroTier Networks:");
    if let Ok(output) = Command::new("zerotier-cli").arg("listnetworks").output() {
        for line in String::from_utf8_lossy(&output.stdout).lines() {
            if line.contains("363c67c55ad2489d") {
                println!("   📡 {}", line);
            }
        }
    } else {
        println!("   ❌ ZeroTier not responding");
    }
    
    // Network Interfaces
    println!("\n🔌 Network Interfaces:");
    if let Ok(output) = Command::new("ip").arg("addr").arg("show").output() {
        let interfaces = String::from_utf8_lossy(&output.stdout);
        for line in interfaces.lines() {
            if line.contains("inet ") && !line.contains("127.0.0.1") {
                println!("   🌐 {}", line.trim());
            }
        }
    }
    
    // Port Status
    println!("\n🚪 Open Ports:");
    if let Ok(output) = Command::new("ss").arg("-tlnp").output() {
        for line in String::from_utf8_lossy(&output.stdout).lines() {
            if line.contains(":22 ") || line.contains(":2222 ") {
                println!("   🔑 SSH: {}", line);
            }
        }
    }
    
    println!("🌐 =========================================");
}

fn show_connection_info() {
    println!("\n🔗 ============== CONNECTION INFO ==============");
    
    if let Some(zt_ip) = get_zerotier_ip() {
        println!("✅ Rental Server Ready for Connections!");
        println!("");
        println!("🌐 ZeroTier Network: 363c67c55ad2489d");
        println!("📡 Server IP: {}", zt_ip);
        println!("");
        println!("🔑 SSH Access Commands:");
        println!("   👤 User Access:  ssh rental@{}", zt_ip);
        println!("   🔧 Root Access:  ssh root@{}", zt_ip);
        println!("");
        println!("🔒 Passwords:");
        println!("   👤 rental user:  rental_user_2024");
        println!("   🔧 root user:    rental_access_2024");
        println!("");
        println!("📋 To share with clients:");
        println!("   1. Join ZeroTier network: 363c67c55ad2489d");
        println!("   2. SSH to: {}", zt_ip);
        
    } else {
        println!("❌ Server not ready - ZeroTier IP not assigned");
        println!("⏳ Waiting for network connection...");
        
        // Try to rejoin network
        println!("🔄 Attempting to rejoin ZeroTier network...");
        let _ = Command::new("zerotier-cli").args(&["join", "363c67c55ad2489d"]).output();
    }
    
    println!("🔗 ========================================");
}

fn show_logs() {
    println!("\n📜 ================== LOGS ==================");
    
    println!("🌐 ZeroTier Logs (last 10 lines):");
    if let Ok(output) = Command::new("tail").arg("-10").arg("/var/log/zerotier-one.log").output() {
        for line in String::from_utf8_lossy(&output.stdout).lines() {
            println!("   {}", line);
        }
    } else {
        println!("   ⚠️  ZeroTier logs not accessible");
    }
    
    println!("\n🔑 SSH Logs (last 5 lines):");
    if let Ok(output) = Command::new("journalctl").args(&["-u", "ssh", "-n", "5", "--no-pager"]).output() {
        for line in String::from_utf8_lossy(&output.stdout).lines() {
            println!("   {}", line);
        }
    } else {
        println!("   ⚠️  SSH logs not accessible");
    }
    
    println!("📜 =====================================");
}

fn setup_services() {
    println!("\n⚙️ ============== SERVICE SETUP ==============");
    
    println!("🔄 Checking and restarting services...");
    
    // ZeroTier
    println!("🌐 ZeroTier Service:");
    if is_zerotier_running() {
        println!("   ✅ Already running");
    } else {
        println!("   🔄 Starting ZeroTier...");
        restart_zerotier();
        thread::sleep(Duration::from_secs(2));
        if is_zerotier_running() {
            println!("   ✅ Started successfully");
        } else {
            println!("   ❌ Failed to start");
        }
    }
    
    // SSH
    println!("🔑 SSH Service:");
    if is_ssh_running() {
        println!("   ✅ Already running");
    } else {
        println!("   🔄 Starting SSH...");
        restart_ssh();
        thread::sleep(Duration::from_secs(1));
        if is_ssh_running() {
            println!("   ✅ Started successfully");
        } else {
            println!("   ❌ Failed to start");
        }
    }
    
    // Join ZeroTier network
    println!("🌐 ZeroTier Network:");
    println!("   🔄 Joining network 363c67c55ad2489d...");
    let _ = Command::new("zerotier-cli").args(&["join", "363c67c55ad2489d"]).output();
    
    thread::sleep(Duration::from_secs(3));
    
    if let Some(ip) = get_zerotier_ip() {
        println!("   ✅ Connected! IP: {}", ip);
    } else {
        println!("   ⏳ Still connecting... (may take 30-60 seconds)");
    }
    
    println!("⚙️ ======================================");
}

fn show_resource_usage() {
    println!("\n💻 Resource Usage:");
    
    // CPU Load
    if let Ok(output) = Command::new("cat").arg("/proc/loadavg").output() {
        let load = String::from_utf8_lossy(&output.stdout);
        println!("   ⚡ CPU Load: {}", load.trim());
    }
    
    // Memory usage percentage
    if let Ok(output) = Command::new("free").output() {
        let free_output = String::from_utf8_lossy(&output.stdout);
        for line in free_output.lines() {
            if line.starts_with("Mem:") {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 3 {
                    if let (Ok(total), Ok(used)) = (parts[1].parse::<f64>(), parts[2].parse::<f64>()) {
                        let usage = (used / total) * 100.0;
                        println!("   💾 Memory: {:.1}% used", usage);
                    }
                }
            }
        }
    }
}

fn show_gpu_info() {
    println!("🎮 GPU Information:");
    if let Ok(output) = Command::new("nvidia-smi").arg("--query-gpu=name,memory.total,memory.used").arg("--format=csv,noheader,nounits").output() {
        for line in String::from_utf8_lossy(&output.stdout).lines() {
            println!("   🎮 {}", line);
        }
    } else if let Ok(output) = Command::new("lspci").output() {
        let lspci_output = String::from_utf8_lossy(&output.stdout);
        for line in lspci_output.lines() {
            if line.to_lowercase().contains("vga") || line.to_lowercase().contains("display") {
                println!("   🎮 {}", line);
            }
        }
    } else {
        println!("   ⚠️  No GPU detected or nvidia-smi not available");
    }
}

fn get_current_time() -> String {
    if let Ok(output) = Command::new("date").output() {
        String::from_utf8_lossy(&output.stdout).trim().to_string()
    } else {
        "Unknown".to_string()
    }
}

fn get_uptime() -> String {
    if let Ok(output) = Command::new("cat").arg("/proc/uptime").output() {
        let uptime_str = String::from_utf8_lossy(&output.stdout);
        if let Some(uptime) = uptime_str.split_whitespace().next() {
            return uptime.to_string();
        }
    }
    "Unknown".to_string()
}

fn get_zerotier_ip() -> Option<String> {
    if let Ok(output) = Command::new("zerotier-cli").arg("listnetworks").output() {
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
    None
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
    let _ = Command::new("systemctl").args(&["restart", "zerotier-one"]).output();
}

fn restart_ssh() {
    let _ = Command::new("systemctl").args(&["restart", "ssh"]).output();
}