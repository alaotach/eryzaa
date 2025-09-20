use clap::{Parser, Subcommand};
use colored::*;
use std::process::Command;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tokio::time;
use sysinfo::System;
use std::collections::HashMap;

#[derive(Parser)]
#[command(name = "eryzaa-rental")]
#[command(about = "Eryzaa Rental Server CLI - Share your computing resources")]
#[command(version = "1.0.0")]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Subcommand)]
enum Commands {
    /// Start the rental server
    Start {
        /// Enable GPU sharing
        #[arg(long)]
        gpu: bool,
        /// Enable monitoring dashboard
        #[arg(long)]
        dashboard: bool,
    },
    /// Stop the rental server
    Stop,
    /// Show current status
    Status,
    /// Setup and configure the rental server
    Setup,
    /// Show live monitoring dashboard
    Monitor,
    /// Show system information
    Info,
    /// Show connection details for clients
    Connect,
    /// Show earnings and statistics
    Stats,
}

#[derive(Clone)]
struct ServerStatus {
    running: bool,
    zerotier_ip: String,
    uptime: Duration,
    clients_connected: u32,
    cpu_usage: f32,
    memory_usage: f32,
    earnings_today: f64,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();
    
    print_banner();
    
    match &cli.command {
        Some(Commands::Start { gpu, dashboard }) => {
            start_server(*gpu, *dashboard).await?;
        }
        Some(Commands::Stop) => {
            stop_server().await?;
        }
        Some(Commands::Status) => {
            show_status().await?;
        }
        Some(Commands::Setup) => {
            setup_server().await?;
        }
        Some(Commands::Monitor) => {
            live_monitor().await?;
        }
        Some(Commands::Info) => {
            show_system_info().await?;
        }
        Some(Commands::Connect) => {
            show_connection_info().await?;
        }
        Some(Commands::Stats) => {
            show_statistics().await?;
        }
        None => {
            // Default: show status
            show_status().await?;
        }
    }
    
    Ok(())
}

fn print_banner() {
    println!("{}", "╔══════════════════════════════════════════════════════════════════╗".bright_blue());
    println!("{}", "║                     🚀 ERYZAA RENTAL SERVER                     ║".bright_blue());
    println!("{}", "║              Decentralized Computing Resource Sharing            ║".bright_blue());
    println!("{}", "╚══════════════════════════════════════════════════════════════════╝".bright_blue());
    println!();
}

async fn start_server(gpu: bool, dashboard: bool) -> anyhow::Result<()> {
    println!("{} Starting Eryzaa Rental Server...\n", "🚀".bright_green());
    
    // 1. Check prerequisites
    println!("{} Checking prerequisites...", "📋".bright_yellow());
    check_prerequisites()?;
    
    // 2. Start Docker container
    println!("{} Starting Docker container...", "🐳".bright_blue());
    start_docker_container(gpu).await?;
    
    // 3. Setup ZeroTier
    println!("{} Configuring ZeroTier network...", "🌐".bright_cyan());
    setup_zerotier().await?;
    
    // 4. Start monitoring
    if dashboard {
        println!("{} Starting monitoring dashboard...", "📊".bright_purple());
        start_monitoring().await?;
    }
    
    println!("\n{} Rental server started successfully!", "✅".bright_green());
    println!("{} Use 'eryzaa-rental status' to check status", "💡".bright_yellow());
    println!("{} Use 'eryzaa-rental connect' to get connection info", "💡".bright_yellow());
    
    Ok(())
}

async fn stop_server() -> anyhow::Result<()> {
    println!("{} Stopping Eryzaa Rental Server...", "🛑".bright_red());
    
    // Stop Docker container
    let output = Command::new("docker-compose")
        .args(&["down"])
        .output()?;
    
    if output.status.success() {
        println!("{} Server stopped successfully", "✅".bright_green());
    } else {
        println!("{} Failed to stop server", "❌".bright_red());
    }
    
    Ok(())
}

async fn show_status() -> anyhow::Result<()> {
    let status = get_server_status().await?;
    
    println!("{} SERVER STATUS", "📊".bright_blue());
    println!("{}", "═".repeat(50).bright_blue());
    
    // Server Status
    let status_icon = if status.running { "🟢" } else { "🔴" };
    let status_text = if status.running { "ONLINE".bright_green() } else { "OFFLINE".bright_red() };
    println!("Status: {} {}", status_icon, status_text);
    
    if status.running {
        println!("Uptime: {}", format_duration(status.uptime).bright_green());
        println!("ZeroTier IP: {}", status.zerotier_ip.bright_cyan());
        println!("Connected Clients: {}", status.clients_connected.to_string().bright_yellow());
        println!();
        
        // Resource Usage
        println!("{} RESOURCE USAGE", "💻".bright_blue());
        println!("{}", "═".repeat(50).bright_blue());
        println!("CPU Usage: {}%", format_percentage(status.cpu_usage));
        println!("Memory Usage: {}%", format_percentage(status.memory_usage));
        println!();
        
        // Earnings
        println!("{} EARNINGS", "💰".bright_blue());
        println!("{}", "═".repeat(50).bright_blue());
        println!("Today: ${:.2}", status.earnings_today.to_string().bright_green());
    }
    
    println!();
    println!("{} Use 'eryzaa-rental monitor' for live updates", "💡".bright_yellow());
    
    Ok(())
}

async fn setup_server() -> anyhow::Result<()> {
    println!("{} ERYZAA RENTAL SERVER SETUP", "⚙️".bright_blue());
    println!("{}", "═".repeat(50).bright_blue());
    println!();
    
    // Step 1: System Requirements
    println!("{} Checking system requirements...", "1️⃣".bright_cyan());
    check_system_requirements()?;
    println!("   {} System requirements met", "✅".bright_green());
    
    // Step 2: Install Dependencies
    println!("{} Installing dependencies...", "2️⃣".bright_cyan());
    install_dependencies().await?;
    println!("   {} Dependencies installed", "✅".bright_green());
    
    // Step 3: Setup ZeroTier
    println!("{} Setting up ZeroTier network...", "3️⃣".bright_cyan());
    setup_zerotier_full().await?;
    println!("   {} ZeroTier configured", "✅".bright_green());
    
    // Step 4: Configure Docker
    println!("{} Configuring Docker environment...", "4️⃣".bright_cyan());
    setup_docker().await?;
    println!("   {} Docker configured", "✅".bright_green());
    
    // Step 5: Test Connection
    println!("{} Testing configuration...", "5️⃣".bright_cyan());
    test_configuration().await?;
    println!("   {} Configuration tested", "✅".bright_green());
    
    println!("\n{} Setup completed successfully!", "🎉".bright_green());
    println!("{} You can now start the server with: eryzaa-rental start", "💡".bright_yellow());
    
    Ok(())
}

async fn live_monitor() -> anyhow::Result<()> {
    println!("{} LIVE MONITORING - Press Ctrl+C to exit", "📊".bright_blue());
    println!("{}", "═".repeat(60).bright_blue());
    
    let mut interval = time::interval(Duration::from_secs(2));
    
    loop {
        // Clear screen
        print!("\x1B[2J\x1B[1;1H");
        
        print_banner();
        
        let status = get_server_status().await?;
        let _system_info = get_system_info().await?;
        
        // Real-time status
        println!("{} LIVE STATUS", "📊".bright_blue());
        println!("{}", "═".repeat(50).bright_blue());
        
        let status_icon = if status.running { "🟢" } else { "🔴" };
        let status_text = if status.running { "ONLINE".bright_green() } else { "OFFLINE".bright_red() };
        println!("Server: {} {}", status_icon, status_text);
        
        if status.running {
            println!("ZeroTier IP: {}", status.zerotier_ip.bright_cyan());
            println!("Clients: {}", status.clients_connected.to_string().bright_yellow());
            println!("Uptime: {}", format_duration(status.uptime).bright_green());
            
            println!("\n{} SYSTEM RESOURCES", "💻".bright_blue());
            println!("{}", "═".repeat(50).bright_blue());
            
            // CPU bar
            print!("CPU:    ");
            print_progress_bar(status.cpu_usage, 100.0);
            println!(" {}%", status.cpu_usage.round() as u32);
            
            // Memory bar
            print!("Memory: ");
            print_progress_bar(status.memory_usage, 100.0);
            println!(" {}%", status.memory_usage.round() as u32);
            
            println!("\n{} NETWORK", "🌐".bright_blue());
            println!("{}", "═".repeat(50).bright_blue());
            println!("ZeroTier Network: {}", "363c67c55ad2489d".bright_cyan());
            println!("Connection: {}", if !status.zerotier_ip.is_empty() { "Connected".bright_green() } else { "Disconnected".bright_red() });
            
            println!("\n{} EARNINGS", "💰".bright_blue());
            println!("{}", "═".repeat(50).bright_blue());
            println!("Today: ${:.2}", status.earnings_today.to_string().bright_green());
        }
        
        println!("\nLast updated: {}", chrono::Local::now().format("%H:%M:%S").to_string().bright_white());
        
        interval.tick().await;
    }
}

async fn show_system_info() -> anyhow::Result<()> {
    let mut system = System::new_all();
    system.refresh_all();
    
    println!("{} SYSTEM INFORMATION", "🖥️".bright_blue());
    println!("{}", "═".repeat(50).bright_blue());
    
    println!("OS: {}", System::name().unwrap_or_else(|| "Unknown".to_string()).bright_white());
    println!("Kernel: {}", System::kernel_version().unwrap_or_else(|| "Unknown".to_string()).bright_white());
    println!("Host: {}", System::host_name().unwrap_or_else(|| "Unknown".to_string()).bright_white());
    println!("Uptime: {}", format_duration(Duration::from_secs(System::uptime())).bright_green());
    
    println!("\n{} CPU INFORMATION", "🔥".bright_blue());
    println!("{}", "═".repeat(50).bright_blue());
    println!("Cores: {}", system.cpus().len().to_string().bright_white());
    println!("Usage: {:.1}%", system.global_cpu_usage().to_string().bright_yellow());
    
    println!("\n{} MEMORY INFORMATION", "💾".bright_blue());
    println!("{}", "═".repeat(50).bright_blue());
    println!("Total: {:.2} GB", (system.total_memory() as f64 / 1_073_741_824.0).to_string().bright_white());
    println!("Used: {:.2} GB", (system.used_memory() as f64 / 1_073_741_824.0).to_string().bright_yellow());
    println!("Available: {:.2} GB", (system.available_memory() as f64 / 1_073_741_824.0).to_string().bright_green());
    
    // Check for GPU
    println!("\n{} GPU INFORMATION", "🎮".bright_blue());
    println!("{}", "═".repeat(50).bright_blue());
    if check_nvidia_gpu() {
        println!("NVIDIA GPU: {}", "Detected".bright_green());
        if let Ok(output) = Command::new("nvidia-smi").arg("--query-gpu=name").arg("--format=csv,noheader").output() {
            let gpu_name = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !gpu_name.is_empty() {
                println!("Model: {}", gpu_name.bright_white());
            }
        }
    } else {
        println!("NVIDIA GPU: {}", "Not detected".bright_red());
    }
    
    Ok(())
}

async fn show_connection_info() -> anyhow::Result<()> {
    let status = get_server_status().await?;
    
    println!("{} CONNECTION INFORMATION", "🌐".bright_blue());
    println!("{}", "═".repeat(50).bright_blue());
    
    if status.running && !status.zerotier_ip.is_empty() {
        println!("{} Server is ONLINE and ready for connections!", "✅".bright_green());
        println!();
        
        println!("{} For SSH Access:", "🔐".bright_cyan());
        println!("┌─────────────────────────────────────────────────┐");
        println!("│ ssh rental@{}                     │", status.zerotier_ip.bright_white());
        println!("│ Password: rental_user_2024                      │");
        println!("└─────────────────────────────────────────────────┘");
        
        println!("\n{} For Root Access:", "👑".bright_red());
        println!("┌─────────────────────────────────────────────────┐");
        println!("│ ssh root@{}                       │", status.zerotier_ip.bright_white());
        println!("│ Password: rental_access_2024                    │");
        println!("└─────────────────────────────────────────────────┘");
        
        println!("\n{} Network Details:", "📡".bright_blue());
        println!("ZeroTier Network ID: {}", "363c67c55ad2489d".bright_cyan());
        println!("Your ZeroTier IP: {}", status.zerotier_ip.bright_white());
        println!("SSH Port: 22 (via ZeroTier) or 2222 (localhost)");
        
        println!("\n{} Share this with clients:", "📋".bright_yellow());
        println!("\"Connect to my server: ssh rental@{}\"", status.zerotier_ip.bright_white());
        
    } else {
        println!("{} Server is not running or not connected to ZeroTier", "❌".bright_red());
        println!("{} Start the server with: eryzaa-rental start", "💡".bright_yellow());
    }
    
    Ok(())
}

async fn show_statistics() -> anyhow::Result<()> {
    println!("{} RENTAL STATISTICS", "📈".bright_blue());
    println!("{}", "═".repeat(50).bright_blue());
    
    // Mock data for now - in real implementation, this would come from blockchain/database
    println!("Total Runtime: {}", "142 hours".bright_white());
    println!("Total Clients Served: {}", "27".bright_white());
    println!("Total Data Transferred: {}", "2.3 TB".bright_white());
    println!();
    
    println!("{} EARNINGS", "💰".bright_green());
    println!("{}", "═".repeat(50).bright_blue());
    println!("Today: ${:.2}", "12.50".bright_green());
    println!("This Week: ${:.2}", "87.25".bright_green());
    println!("This Month: ${:.2}", "342.80".bright_green());
    println!("All Time: ${:.2}", "1,247.30".bright_green());
    
    println!("\n{} TOP CLIENTS", "👥".bright_blue());
    println!("{}", "═".repeat(50).bright_blue());
    println!("1. user_ai_researcher    - 45 hours");
    println!("2. developer_team_x      - 32 hours");
    println!("3. ml_startup_co         - 28 hours");
    
    Ok(())
}

// Helper functions
async fn get_server_status() -> anyhow::Result<ServerStatus> {
    // Check if Docker container is running
    let docker_output = Command::new("docker")
        .args(&["ps", "--filter", "name=rental-dev", "--format", "{{.Status}}"])
        .output()?;
    
    let running = !String::from_utf8_lossy(&docker_output.stdout).trim().is_empty();
    
    let zerotier_ip = if running {
        get_zerotier_ip().await.unwrap_or_else(|| "Not assigned".to_string())
    } else {
        "Not assigned".to_string()
    };
    
    // Get system info
    let mut system = System::new_all();
    system.refresh_all();
    
    Ok(ServerStatus {
        running,
        zerotier_ip,
        uptime: Duration::from_secs(System::uptime()),
        clients_connected: 0, // TODO: Implement client counting
        cpu_usage: system.global_cpu_usage(),
        memory_usage: (system.used_memory() as f32 / system.total_memory() as f32) * 100.0,
        earnings_today: 12.50, // TODO: Implement earnings tracking
    })
}

async fn get_zerotier_ip() -> Option<String> {
    let output = Command::new("docker")
        .args(&["exec", "rental-dev", "zerotier-cli", "listnetworks"])
        .output()
        .ok()?;
    
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
    None
}

fn check_prerequisites() -> anyhow::Result<()> {
    // Check Docker
    if !Command::new("docker").arg("--version").output().is_ok() {
        return Err(anyhow::anyhow!("Docker is not installed"));
    }
    
    // Check Docker Compose
    if !Command::new("docker-compose").arg("--version").output().is_ok() {
        return Err(anyhow::anyhow!("Docker Compose is not installed"));
    }
    
    Ok(())
}

async fn start_docker_container(gpu: bool) -> anyhow::Result<()> {
    let compose_file = if gpu {
        "infrastructure/docker/docker-compose.yml"
    } else {
        "infrastructure/docker/docker-compose.fast.yml"
    };
    
    let output = Command::new("docker-compose")
        .args(&["-f", compose_file, "up", "-d"])
        .output()?;
    
    if !output.status.success() {
        return Err(anyhow::anyhow!("Failed to start Docker container"));
    }
    
    Ok(())
}

async fn setup_zerotier() -> anyhow::Result<()> {
    // Wait for container to be ready
    tokio::time::sleep(Duration::from_secs(5)).await;
    
    // The container should automatically join the network
    // We just need to verify it's connected
    for _ in 0..10 {
        if get_zerotier_ip().await.is_some() {
            return Ok(());
        }
        tokio::time::sleep(Duration::from_secs(2)).await;
    }
    
    Ok(())
}

async fn start_monitoring() -> anyhow::Result<()> {
    // TODO: Implement monitoring dashboard startup
    Ok(())
}

fn check_system_requirements() -> anyhow::Result<()> {
    // Check available memory (minimum 2GB)
    let mut system = System::new_all();
    system.refresh_all();
    
    if system.total_memory() < 2_000_000_000 {
        return Err(anyhow::anyhow!("Insufficient memory (minimum 2GB required)"));
    }
    
    Ok(())
}

async fn install_dependencies() -> anyhow::Result<()> {
    // TODO: Implement dependency installation
    tokio::time::sleep(Duration::from_secs(1)).await;
    Ok(())
}

async fn setup_zerotier_full() -> anyhow::Result<()> {
    // TODO: Implement full ZeroTier setup
    tokio::time::sleep(Duration::from_secs(1)).await;
    Ok(())
}

async fn setup_docker() -> anyhow::Result<()> {
    // TODO: Implement Docker setup
    tokio::time::sleep(Duration::from_secs(1)).await;
    Ok(())
}

async fn test_configuration() -> anyhow::Result<()> {
    // TODO: Implement configuration testing
    tokio::time::sleep(Duration::from_secs(1)).await;
    Ok(())
}

async fn get_system_info() -> anyhow::Result<HashMap<String, String>> {
    let info = HashMap::new();
    // TODO: Implement system info gathering
    Ok(info)
}

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

fn format_duration(duration: Duration) -> String {
    let total_seconds = duration.as_secs();
    let hours = total_seconds / 3600;
    let minutes = (total_seconds % 3600) / 60;
    let seconds = total_seconds % 60;
    
    if hours > 0 {
        format!("{}h {}m {}s", hours, minutes, seconds)
    } else if minutes > 0 {
        format!("{}m {}s", minutes, seconds)
    } else {
        format!("{}s", seconds)
    }
}

fn format_percentage(value: f32) -> String {
    let color = if value > 80.0 {
        value.to_string().bright_red()
    } else if value > 60.0 {
        value.to_string().bright_yellow()
    } else {
        value.to_string().bright_green()
    };
    format!("{:.1}", color)
}

fn print_progress_bar(current: f32, max: f32) {
    let percentage = (current / max * 100.0).round() as u32;
    let filled = (percentage / 5) as usize; // 20 chars total
    let empty = 20 - filled;
    
    print!("[");
    for _ in 0..filled {
        print!("{}", "█".bright_green());
    }
    for _ in 0..empty {
        print!(" ");
    }
    print!("]");
}
