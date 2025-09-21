use eframe::egui;
use std::process::Command;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, SystemTime};
use sysinfo::System;
use eryzaa_discovery::{
    DiscoveryService, NodeAdvertisement, NodeCapabilities, NodeStatus, NodeType,
    create_rental_advertisement,
};
use eryzaa_ssh_manager::{SshManager, JobAccess};
use uuid::Uuid;

pub struct EryzaaRentalApp {
    // System state
    system: Arc<Mutex<System>>,
    setup_status: Arc<Mutex<SetupStatus>>,
    server_info: Arc<Mutex<ServerInfo>>,
    
    // Discovery service
    discovery_service: Option<Arc<Mutex<DiscoveryService>>>,
    node_id: String,
    connected_clients: Arc<Mutex<Vec<NodeAdvertisement>>>,
    
    // SSH management
    ssh_manager: Arc<SshManager>,
    
    // Rental state
    is_renting_active: bool,
    
    // UI state
    selected_tab: Tab,
    show_setup_wizard: bool,
    setup_step: usize,
    
    // Settings
    settings: RentalSettings,
    
    // Setup wizard
    setup_config: SetupConfig,
    
    // Auto-refresh
    last_update: SystemTime,
}

impl Default for EryzaaRentalApp {
    fn default() -> Self {
        Self {
            system: Arc::new(Mutex::new(System::new_all())),
            setup_status: Arc::new(Mutex::new(SetupStatus::default())),
            server_info: Arc::new(Mutex::new(ServerInfo::default())),
            discovery_service: None,
            node_id: Uuid::new_v4().to_string(),
            connected_clients: Arc::new(Mutex::new(Vec::new())),
            ssh_manager: Arc::new(SshManager::new()),
            is_renting_active: false,
            selected_tab: Tab::default(),
            show_setup_wizard: false,
            setup_step: 0,
            settings: RentalSettings::default(),
            setup_config: SetupConfig::default(),
            last_update: SystemTime::now(),
        }
    }
}

#[derive(Debug, Clone)]
pub enum SetupStatus {
    NotStarted,
    Installing(String), // Current step
    Running,
    Error(String),
}

impl Default for SetupStatus {
    fn default() -> Self {
        SetupStatus::NotStarted
    }
}

#[derive(Debug, Clone)]
pub struct ServerInfo {
    zerotier_ip: String,
    zerotier_network: String,
    ssh_status: bool,
    uptime: Duration,
    clients_connected: u32,
}

impl Default for ServerInfo {
    fn default() -> Self {
        ServerInfo {
            zerotier_ip: "Not assigned".to_string(),
            zerotier_network: "363c67c55ad2489d".to_string(),
            ssh_status: false,
            uptime: Duration::new(0, 0),
            clients_connected: 0,
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum Tab {
    Dashboard,
    Setup,
    System,
    Network,
    Clients,
    SshUsers,
    Settings,
}

impl Default for Tab {
    fn default() -> Self {
        Tab::Dashboard
    }
}

#[derive(Debug, Clone)]
pub struct RentalSettings {
    auto_start: bool,
    enable_gpu_sharing: bool,
    max_cpu_usage: f32,
    max_memory_usage: f32,
    allowed_clients: Vec<String>,
    pricing_per_hour: f32,
}

impl Default for RentalSettings {
    fn default() -> Self {
        RentalSettings {
            auto_start: true,
            enable_gpu_sharing: true,
            max_cpu_usage: 80.0,
            max_memory_usage: 80.0,
            allowed_clients: vec![],
            pricing_per_hour: 5.0,
        }
    }
}

#[derive(Debug, Clone)]
pub struct SetupConfig {
    enable_gpu: bool,
    enable_ssh: bool,
    custom_network_id: String,
    install_dev_tools: bool,
    setup_monitoring: bool,
}

impl Default for SetupConfig {
    fn default() -> Self {
        SetupConfig {
            enable_gpu: true,
            enable_ssh: true,
            custom_network_id: "363c67c55ad2489d".to_string(),
            install_dev_tools: true,
            setup_monitoring: true,
        }
    }
}

impl EryzaaRentalApp {
    pub fn new(_cc: &eframe::CreationContext<'_>) -> Self {
        let system = Arc::new(Mutex::new(System::new_all()));
        
        let mut app = Self {
            system,
            last_update: SystemTime::now(),
            ..Default::default()
        };
        
        // Initialize discovery service
        app.initialize_discovery_service();
        
        app
    }
    
    fn initialize_discovery_service(&mut self) {
        // Get system capabilities
        let sys = self.system.lock().unwrap();
        let capabilities = NodeCapabilities {
            cpu_cores: sys.cpus().len() as u32,
            memory_gb: (sys.total_memory() / 1_073_741_824) as u32,
            gpu_count: self.detect_gpu_count(),
            gpu_memory_gb: self.detect_gpu_memory(),
            disk_space_gb: 1000, // Placeholder - would need proper disk detection
            network_speed_mbps: 1000, // Placeholder
            supports_docker: self.check_docker_support(),
            supports_gpu: self.detect_gpu_count() > 0,
            max_concurrent_jobs: 4,
        };
        drop(sys);
        
        // Get network information
        let (local_ip, zerotier_ip) = self.get_network_info();
        
        // Create node advertisement
        let advertisement = create_rental_advertisement(
            self.node_id.clone(),
            local_ip,
            zerotier_ip,
            capabilities,
            "363c67c55ad2489d".to_string(), // Default ZeroTier network
        );
        
        // Initialize discovery service
        match DiscoveryService::new(advertisement) {
            Ok(service) => {
                let service_arc = Arc::new(Mutex::new(service));
                
                // Start the discovery service
                if let Ok(mut service) = service_arc.lock() {
                    if service.start().is_ok() {
                        println!("🌐 Discovery service started - advertising rental node");
                        println!("📡 Node ID: {}", self.node_id);
                        self.discovery_service = Some(service_arc);
                    }
                } else {
                    println!("❌ Failed to start discovery service");
                }
            }
            Err(e) => {
                println!("❌ Failed to initialize discovery service: {}", e);
            }
        }
    }
    
    fn detect_gpu_count(&self) -> u32 {
        // Try to detect GPUs using nvidia-smi
        if let Ok(output) = Command::new("nvidia-smi").arg("-L").output() {
            if output.status.success() {
                let output_str = String::from_utf8_lossy(&output.stdout);
                return output_str.lines().count() as u32;
            }
        }
        
        // Try lspci for any GPU detection
        if let Ok(output) = Command::new("lspci").output() {
            if output.status.success() {
                let output_str = String::from_utf8_lossy(&output.stdout);
                return output_str.lines()
                    .filter(|line| line.to_lowercase().contains("vga") || 
                                  line.to_lowercase().contains("3d") ||
                                  line.to_lowercase().contains("display"))
                    .count() as u32;
            }
        }
        
        0
    }
    
    fn detect_gpu_memory(&self) -> u32 {
        // Try to get GPU memory using nvidia-smi
        if let Ok(output) = Command::new("nvidia-smi")
            .args(&["--query-gpu=memory.total", "--format=csv,noheader,nounits"])
            .output() 
        {
            if output.status.success() {
                let output_str = String::from_utf8_lossy(&output.stdout);
                if let Ok(memory_mb) = output_str.trim().parse::<u32>() {
                    return memory_mb / 1024; // Convert MB to GB
                }
            }
        }
        
        0
    }
    
    fn check_docker_support(&self) -> bool {
        Command::new("docker")
            .arg("--version")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }
    
    fn get_network_info(&self) -> (String, Option<String>) {
        let mut local_ip = "127.0.0.1".to_string();
        let mut zerotier_ip = None;
        
        // Get local IP (try to get non-loopback interface)
        if let Ok(output) = Command::new("hostname").arg("-I").output() {
            if output.status.success() {
                let output_str = String::from_utf8_lossy(&output.stdout);
                if let Some(ip) = output_str.split_whitespace().next() {
                    if ip != "127.0.0.1" && !ip.is_empty() {
                        local_ip = ip.to_string();
                    }
                }
            }
        }
        
        // Get ZeroTier IP
        if let Ok(output) = Command::new("zerotier-cli").args(&["listnetworks"]).output() {
            if output.status.success() {
                let output_str = String::from_utf8_lossy(&output.stdout);
                for line in output_str.lines() {
                    if line.contains("363c67c55ad2489d") {
                        let parts: Vec<&str> = line.split_whitespace().collect();
                        if parts.len() > 6 {
                            let ip = parts[6].split('/').next().unwrap_or("");
                            if !ip.is_empty() && ip != "-" {
                                zerotier_ip = Some(ip.to_string());
                                break;
                            }
                        }
                    }
                }
            }
        }
        
        (local_ip, zerotier_ip)
    }
    
    fn update_discovery_service(&mut self) {
        if let Some(ref service_arc) = self.discovery_service {
            if let Ok(mut service) = service_arc.lock() {
                // Update status based on current state
                let status = match self.setup_status.lock().unwrap().clone() {
                    SetupStatus::Running => NodeStatus::Available,
                    SetupStatus::Installing(_) => NodeStatus::Maintenance,
                    _ => NodeStatus::Offline,
                };
                
                service.update_status(status);
                
                // Get connected clients
                let clients = service.get_nodes_by_type(NodeType::Client);
                *self.connected_clients.lock().unwrap() = clients;
            }
        }
    }
    
    fn one_click_setup(&mut self) {
        let status = Arc::clone(&self.setup_status);
        let config = self.setup_config.clone();
        
        *status.lock().unwrap() = SetupStatus::Installing("Starting setup...".to_string());
        
        thread::spawn(move || {
            let steps: Vec<(&str, fn(&SetupConfig) -> Result<(), String>)> = vec![
                ("Checking system requirements", EryzaaRentalApp::check_requirements),
                ("Installing Docker", EryzaaRentalApp::install_docker),
                ("Installing ZeroTier", EryzaaRentalApp::install_zerotier),
                ("Setting up network", EryzaaRentalApp::setup_network),
                ("Deploying rental server", EryzaaRentalApp::deploy_rental_server),
                ("Configuring services", EryzaaRentalApp::configure_services),
            ];
            
            for (step_name, step_fn) in steps {
                *status.lock().unwrap() = SetupStatus::Installing(step_name.to_string());
                thread::sleep(Duration::from_secs(1)); // Show step
                
                if let Err(e) = step_fn(&config) {
                    *status.lock().unwrap() = SetupStatus::Error(format!("{}: {}", step_name, e));
                    return;
                }
            }
            
            *status.lock().unwrap() = SetupStatus::Running;
        });
    }
    
    fn check_requirements(_config: &SetupConfig) -> Result<(), String> {
        // Check if running as admin/sudo on Windows/Linux
        #[cfg(unix)]
        {
            if nix::unistd::geteuid().is_root() == false {
                return Err("Please run as administrator (sudo)".to_string());
            }
        }
        
        #[cfg(windows)]
        {
            // On Windows, check if running as administrator
            use std::ptr;
            use winapi::um::handleapi::CloseHandle;
            use winapi::um::processthreadsapi::{GetCurrentProcess, OpenProcessToken};
            use winapi::um::securitybaseapi::GetTokenInformation;
            use winapi::um::winnt::{TokenElevation, TOKEN_ELEVATION, TOKEN_QUERY};
            
            unsafe {
                let mut token = ptr::null_mut();
                if OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token) == 0 {
                    return Err("Failed to check administrator privileges".to_string());
                }
                
                let mut elevation = TOKEN_ELEVATION { TokenIsElevated: 0 };
                let mut ret_len = 0;
                
                if GetTokenInformation(
                    token,
                    TokenElevation,
                    &mut elevation as *mut _ as *mut _,
                    std::mem::size_of::<TOKEN_ELEVATION>() as u32,
                    &mut ret_len,
                ) == 0 {
                    CloseHandle(token);
                    return Err("Failed to check administrator privileges".to_string());
                }
                
                CloseHandle(token);
                
                if elevation.TokenIsElevated == 0 {
                    return Err("Please run as administrator".to_string());
                }
            }
        }
        
        // Check internet connection with cross-platform ping
        let ping_args = if cfg!(windows) {
            vec!["-n", "1", "google.com"]
        } else {
            vec!["-c", "1", "google.com"]
        };
        
        let ping = Command::new("ping")
            .args(&ping_args)
            .output();
            
        if ping.is_err() {
            return Err("No internet connection".to_string());
        }
        
        Ok(())
    }
    
    fn install_docker(_config: &SetupConfig) -> Result<(), String> {
        // Check if Docker is already installed
        if Command::new("docker").arg("--version").output().is_ok() {
            return Ok(());
        }
        
        #[cfg(target_os = "linux")]
        {
            let output = Command::new("sh")
                .arg("-c")
                .arg("curl -fsSL https://get.docker.com | sh")
                .output()
                .map_err(|e| e.to_string())?;
                
            if !output.status.success() {
                return Err("Failed to install Docker".to_string());
            }
            
            // Start Docker service
            let _ = Command::new("systemctl")
                .args(&["start", "docker"])
                .output();
            let _ = Command::new("systemctl")
                .args(&["enable", "docker"])
                .output();
        }
        
        #[cfg(target_os = "windows")]
        {
            return Err("Please install Docker Desktop manually from https://www.docker.com/products/docker-desktop".to_string());
        }
        
        #[cfg(target_os = "macos")]
        {
            return Err("Please install Docker Desktop manually from https://www.docker.com/products/docker-desktop".to_string());
        }
        
        Ok(())
    }
    
    fn install_zerotier(_config: &SetupConfig) -> Result<(), String> {
        // Check if ZeroTier is already installed
        if Command::new("zerotier-cli").arg("info").output().is_ok() {
            return Ok(());
        }
        
        #[cfg(any(target_os = "linux", target_os = "macos"))]
        {
            let output = Command::new("sh")
                .arg("-c")
                .arg("curl -s https://install.zerotier.com | bash")
                .output()
                .map_err(|e| e.to_string())?;
                
            if !output.status.success() {
                return Err("Failed to install ZeroTier".to_string());
            }
        }
        
        #[cfg(target_os = "windows")]
        {
            return Err("Please install ZeroTier manually from https://www.zerotier.com/download/".to_string());
        }
        
        Ok(())
    }
    
    fn setup_network(config: &SetupConfig) -> Result<(), String> {
        // Join ZeroTier network
        let output = Command::new("zerotier-cli")
            .args(&["join", &config.custom_network_id])
            .output()
            .map_err(|e| e.to_string())?;
            
        if !output.status.success() {
            return Err("Failed to join ZeroTier network".to_string());
        }
        
        Ok(())
    }
    
    fn deploy_rental_server(config: &SetupConfig) -> Result<(), String> {
        let deploy_mode = if config.enable_gpu { "deploy" } else { "fast" };
        
        let output = Command::new("../manage.sh")
            .arg(deploy_mode)
            .output()
            .map_err(|e| e.to_string())?;
            
        if !output.status.success() {
            return Err("Failed to deploy rental server".to_string());
        }
        
        Ok(())
    }
    
    fn configure_services(_config: &SetupConfig) -> Result<(), String> {
        // Start monitoring services
        thread::sleep(Duration::from_secs(5));
        Ok(())
    }
    
    fn update_system_info(&mut self) {
        if self.last_update.elapsed().unwrap_or(Duration::new(0, 0)) > Duration::from_secs(2) {
            let mut sys = self.system.lock().unwrap();
            sys.refresh_all();
            self.last_update = SystemTime::now();
            
            // Update server info
            let mut server_info = self.server_info.lock().unwrap();
            
            // Get ZeroTier IP
            if let Ok(output) = Command::new("zerotier-cli").args(&["listnetworks"]).output() {
                let output_str = String::from_utf8_lossy(&output.stdout);
                for line in output_str.lines() {
                    if line.contains(&server_info.zerotier_network) {
                        let parts: Vec<&str> = line.split_whitespace().collect();
                        if parts.len() > 6 {
                            let ip = parts[6].split('/').next().unwrap_or("Not assigned");
                            server_info.zerotier_ip = ip.to_string();
                        }
                    }
                }
            }
            
            // Check SSH status - cross-platform
            #[cfg(unix)]
            {
                server_info.ssh_status = Command::new("pgrep")
                    .arg("sshd")
                    .output()
                    .map(|o| o.status.success())
                    .unwrap_or(false);
            }
            
            #[cfg(windows)]
            {
                server_info.ssh_status = Command::new("sc")
                    .args(&["query", "sshd"])
                    .output()
                    .map(|o| o.status.success())
                    .unwrap_or(false);
            }
            
            drop(server_info);
            drop(sys);
            
            // Update discovery service
            self.update_discovery_service();
        }
    }
    
    fn start_renting(&mut self) {
        println!("🚀 Starting rental service...");
        self.is_renting_active = true;
        
        // Initialize discovery service if not already done
        if self.discovery_service.is_none() {
            self.initialize_discovery_service();
        }
        
        // Update discovery service to show as available
        if let Some(ref service_arc) = self.discovery_service {
            if let Ok(mut service) = service_arc.lock() {
                service.update_status(NodeStatus::Available);
            }
        }
        
        println!("✅ Rental service started - PC is now available for SSH access");
    }
    
    fn stop_renting(&mut self) {
        println!("🛑 Stopping rental service...");
        self.is_renting_active = false;
        
        // Clean up any active SSH users
        let ssh_manager = self.ssh_manager.clone();
        let active_jobs = ssh_manager.get_active_jobs();
        
        for job in active_jobs {
            let job_id = job.job_id.clone();
            let ssh_manager_clone = ssh_manager.clone();
            
            tokio::spawn(async move {
                if let Err(e) = ssh_manager_clone.remove_job_user(&job_id).await {
                    eprintln!("Failed to remove SSH user for job {}: {}", job_id, e);
                } else {
                    println!("Removed SSH user for job: {}", job_id);
                }
            });
        }
        
        // Update discovery service to show as offline
        if let Some(ref service_arc) = self.discovery_service {
            if let Ok(mut service) = service_arc.lock() {
                service.update_status(NodeStatus::Offline);
            }
        }
        
        println!("✅ Rental service stopped - PC is no longer available");
    }
}

impl eframe::App for EryzaaRentalApp {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        // Auto-update system info
        self.update_system_info();
        ctx.request_repaint_after(Duration::from_secs(2));
        
        // Show setup wizard if not set up
        let status = self.setup_status.lock().unwrap().clone();
        if matches!(status, SetupStatus::NotStarted) && !self.show_setup_wizard {
            self.show_setup_wizard = true;
        }
        
        if self.show_setup_wizard {
            self.show_setup_wizard_window(ctx);
        }
        
        egui::TopBottomPanel::top("top_panel").show(ctx, |ui| {
            egui::menu::bar(ui, |ui| {
                ui.heading("🏠 Eryzaa Rental Server");
                ui.separator();
                
                ui.selectable_value(&mut self.selected_tab, Tab::Dashboard, "📊 Dashboard");
                ui.selectable_value(&mut self.selected_tab, Tab::Setup, "⚙️ Setup");
                ui.selectable_value(&mut self.selected_tab, Tab::System, "🖥️ System");
                ui.selectable_value(&mut self.selected_tab, Tab::Network, "🌐 Network");
                ui.selectable_value(&mut self.selected_tab, Tab::Clients, "👥 Clients");
                ui.selectable_value(&mut self.selected_tab, Tab::SshUsers, "🔐 SSH Users");
                ui.selectable_value(&mut self.selected_tab, Tab::Settings, "🔧 Settings");
                
                ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                    if ui.button("🔄 Refresh").clicked() {
                        self.update_system_info();
                    }
                });
            });
        });
        
        egui::CentralPanel::default().show(ctx, |ui| {
            match self.selected_tab {
                Tab::Dashboard => self.show_dashboard(ui),
                Tab::Setup => self.show_setup(ui),
                Tab::System => self.show_system(ui),
                Tab::Network => self.show_network(ui),
                Tab::Clients => self.show_clients(ui),
                Tab::SshUsers => self.show_ssh_users(ui),
                Tab::Settings => self.show_settings(ui),
            }
        });
    }
}

impl EryzaaRentalApp {
    fn show_setup_wizard_window(&mut self, ctx: &egui::Context) {
        egui::Window::new("🚀 Eryzaa Setup Wizard")
            .collapsible(false)
            .resizable(false)
            .anchor(egui::Align2::CENTER_CENTER, egui::Vec2::ZERO)
            .show(ctx, |ui| {
                ui.heading("Welcome to Eryzaa Rental Server!");
                ui.separator();
                
                let status = self.setup_status.lock().unwrap().clone();
                
                match &status {
                    SetupStatus::NotStarted => {
                        ui.label("This wizard will set up your rental server with one click.");
                        ui.add_space(10.0);
                        
                        ui.group(|ui| {
                            ui.label("Setup will install:");
                            ui.label("• Docker and Docker Compose");
                            ui.label("• ZeroTier networking");
                            ui.label("• SSH server");
                            ui.label("• Rental server container");
                            ui.label("• System monitoring");
                        });
                        
                        ui.add_space(20.0);
                        
                        ui.horizontal(|ui| {
                            if ui.button("🚀 Start One-Click Setup").clicked() {
                                self.one_click_setup();
                            }
                            if ui.button("⚙️ Advanced Setup").clicked() {
                                self.show_setup_wizard = false;
                                self.selected_tab = Tab::Setup;
                            }
                        });
                    }
                    SetupStatus::Installing(step) => {
                        ui.label("Setting up your rental server...");
                        ui.add_space(10.0);
                        
                        ui.horizontal(|ui| {
                            ui.spinner();
                            ui.label(step);
                        });
                        
                        ui.add_space(10.0);
                        ui.label("This may take a few minutes. Please wait...");
                    }
                    SetupStatus::Running => {
                        ui.label("✅ Setup completed successfully!");
                        ui.add_space(10.0);
                        
                        let server_info = self.server_info.lock().unwrap();
                        ui.group(|ui| {
                            ui.label("Your rental server is now running:");
                            ui.label(format!("🌐 ZeroTier IP: {}", server_info.zerotier_ip));
                            ui.label("👤 SSH Username: rental");
                            ui.label("🔑 SSH Password: rental_user_2024");
                        });
                        
                        ui.add_space(20.0);
                        
                        if ui.button("🎉 Go to Dashboard").clicked() {
                            self.show_setup_wizard = false;
                            self.selected_tab = Tab::Dashboard;
                        }
                    }
                    SetupStatus::Error(err) => {
                        ui.colored_label(egui::Color32::RED, "❌ Setup failed!");
                        ui.add_space(10.0);
                        
                        ui.group(|ui| {
                            ui.label("Error:");
                            ui.label(err);
                        });
                        
                        ui.add_space(20.0);
                        
                        ui.horizontal(|ui| {
                            if ui.button("🔄 Retry Setup").clicked() {
                                self.one_click_setup();
                            }
                            if ui.button("⚙️ Manual Setup").clicked() {
                                self.show_setup_wizard = false;
                                self.selected_tab = Tab::Setup;
                            }
                        });
                    }
                }
            });
    }
    
    fn show_dashboard(&mut self, ui: &mut egui::Ui) {
        ui.heading("📊 Rental Server Dashboard");
        ui.separator();
        
        let status = self.setup_status.lock().unwrap().clone();
        let server_info = self.server_info.lock().unwrap().clone();
        let sys = self.system.lock().unwrap();
        
        // Server Status
        ui.group(|ui| {
            ui.heading("Rental Server Status");
            
            // Main rental toggle
            ui.horizontal(|ui| {
                if self.is_renting_active {
                    ui.colored_label(egui::Color32::GREEN, "🟢");
                    ui.strong("RENTING ACTIVE - PC Available for SSH Access");
                } else {
                    ui.colored_label(egui::Color32::RED, "🔴"); 
                    ui.label("Rental Stopped - PC Not Available");
                }
            });
            
            ui.add_space(5.0);
            
            // Start/Stop button
            ui.horizontal(|ui| {
                if self.is_renting_active {
                    if ui.button("🛑 Stop Renting").clicked() {
                        self.stop_renting();
                    }
                    ui.label("Click to make your PC unavailable for rental");
                } else {
                    if ui.button("🚀 Start Renting").clicked() {
                        self.start_renting();
                    }
                    ui.label("Click to make your PC available for SSH rental");
                }
            });
            
            // Show current status details
            match &status {
                SetupStatus::Running => {
                    ui.separator();
                    ui.label(format!("🌐 ZeroTier IP: {}", server_info.zerotier_ip));
                    ui.label(format!("🔌 SSH Service: {}", if server_info.ssh_status { "Running" } else { "Stopped" }));
                    
                    // Show active SSH users
                    let active_jobs = self.ssh_manager.get_active_jobs();
                    if !active_jobs.is_empty() {
                        ui.colored_label(egui::Color32::ORANGE, format!("🔐 Active SSH Users: {}", active_jobs.len()));
                        for job in &active_jobs {
                            ui.label(format!("  → {}: {}", job.ssh_user.username, job.client_id));
                        }
                    } else if self.is_renting_active {
                        ui.colored_label(egui::Color32::GREEN, "✅ Ready for new SSH connections");
                    }
                }
                SetupStatus::Installing(step) => {
                    ui.horizontal(|ui| {
                        ui.colored_label(egui::Color32::YELLOW, "🟡");
                        ui.spinner();
                        ui.label(format!("Setting up: {}", step));
                    });
                }
                _ => {
                    ui.separator();
                    ui.colored_label(egui::Color32::YELLOW, "⚠️ Setup required before renting");
                    if ui.button("🚀 Start Setup").clicked() {
                        self.show_setup_wizard = true;
                    }
                }
            }
        });
        
        ui.add_space(10.0);
        
        // Quick Actions (if renting is active)
        if self.is_renting_active {
            ui.group(|ui| {
                ui.heading("🛠️ Quick Actions");
                ui.horizontal(|ui| {
                    if ui.button("🔐 View SSH Users").clicked() {
                        self.selected_tab = Tab::SshUsers;
                    }
                    if ui.button("👥 View Clients").clicked() {
                        self.selected_tab = Tab::Clients;
                    }
                    if ui.button("🧪 Test Job").clicked() {
                        // Create a test job
                        let ssh_manager = self.ssh_manager.clone();
                        let test_job_id = format!("test_job_{}", uuid::Uuid::new_v4());
                        let test_client_id = "dashboard_test".to_string();
                        
                        tokio::spawn(async move {
                            match ssh_manager.create_job_user(&test_job_id, &test_client_id, 1).await {
                                Ok(job_access) => {
                                    println!("Created test SSH user: {}", job_access.ssh_user.username);
                                }
                                Err(e) => {
                                    eprintln!("Failed to create test SSH user: {}", e);
                                }
                            }
                        });
                    }
                });
            });
            
            ui.add_space(10.0);
        }
        
        // Setup Status
        ui.group(|ui| {
            ui.heading("Setup Status");
            match &status {
                SetupStatus::Running => {
                    ui.horizontal(|ui| {
                        ui.colored_label(egui::Color32::GREEN, "🟢");
                        ui.label("Rental Server: Online");
                    });
                    ui.label(format!("🌐 ZeroTier IP: {}", server_info.zerotier_ip));
                    ui.label(format!("🔌 SSH: {}", if server_info.ssh_status { "Running" } else { "Stopped" }));
                }
                SetupStatus::Installing(step) => {
                    ui.horizontal(|ui| {
                        ui.colored_label(egui::Color32::YELLOW, "🟡");
                        ui.spinner();
                        ui.label(format!("Setting up: {}", step));
                    });
                }
                _ => {
                    ui.horizontal(|ui| {
                        ui.colored_label(egui::Color32::RED, "🔴");
                        ui.label("Server: Not Running");
                    });
                    if ui.button("🚀 Start Setup").clicked() {
                        self.show_setup_wizard = true;
                    }
                }
            }
        });
        
        ui.add_space(10.0);
        
        // System Resources
        ui.group(|ui| {
            ui.heading("System Resources");
            
            // CPU Usage
            let cpu_usage = sys.global_cpu_info().cpu_usage();
            ui.horizontal(|ui| {
                ui.label("🔥 CPU:");
                ui.add(egui::ProgressBar::new(cpu_usage / 100.0).text(format!("{:.1}%", cpu_usage)));
            });
            
            // Memory Usage
            let memory_usage = (sys.used_memory() as f64 / sys.total_memory() as f64) as f32;
            ui.horizontal(|ui| {
                ui.label("💾 Memory:");
                ui.add(egui::ProgressBar::new(memory_usage).text(format!("{:.1}%", memory_usage * 100.0)));
            });
            
            // Disk Usage - simplified for now
            ui.horizontal(|ui| {
                ui.label("💽 Disk:");
                ui.add(egui::ProgressBar::new(0.5).text("50.0%")); // Placeholder
            });
        });
        
        ui.add_space(10.0);
        
        // Quick Actions
        ui.group(|ui| {
            ui.heading("Quick Actions");
            ui.horizontal(|ui| {
                if ui.button("🔄 Restart Server").clicked() {
                    // Restart server
                }
                if ui.button("🛑 Stop Server").clicked() {
                    // Stop server
                }
                if ui.button("📋 View Logs").clicked() {
                    // View logs
                }
            });
        });
    }
    
    fn show_setup(&mut self, ui: &mut egui::Ui) {
        ui.heading("⚙️ Server Setup");
        ui.separator();
        
        ui.group(|ui| {
            ui.heading("One-Click Setup");
            ui.label("Automatically install and configure everything:");
            
            if ui.button("🚀 Start Automatic Setup").clicked() {
                self.one_click_setup();
            }
        });
        
        ui.add_space(20.0);
        
        ui.group(|ui| {
            ui.heading("Manual Configuration");
            
            ui.checkbox(&mut self.setup_config.enable_gpu, "Enable GPU sharing");
            ui.checkbox(&mut self.setup_config.enable_ssh, "Enable SSH access");
            ui.checkbox(&mut self.setup_config.install_dev_tools, "Install development tools");
            ui.checkbox(&mut self.setup_config.setup_monitoring, "Setup system monitoring");
            
            ui.add_space(10.0);
            
            ui.horizontal(|ui| {
                ui.label("ZeroTier Network ID:");
                ui.text_edit_singleline(&mut self.setup_config.custom_network_id);
            });
        });
        
        let status = self.setup_status.lock().unwrap().clone();
        if let SetupStatus::Installing(step) = &status {
            ui.add_space(20.0);
            ui.group(|ui| {
                ui.horizontal(|ui| {
                    ui.spinner();
                    ui.label(format!("Installing: {}", step));
                });
            });
        }
    }
    
    fn show_system(&mut self, ui: &mut egui::Ui) {
        ui.heading("🖥️ System Monitor");
        ui.separator();
        
        let sys = self.system.lock().unwrap();
        
        // System Info
        ui.group(|ui| {
            ui.heading("System Information");
            ui.label(format!("OS: {}", System::name().unwrap_or_else(|| "Unknown".to_string())));
            ui.label(format!("Kernel: {}", System::kernel_version().unwrap_or_else(|| "Unknown".to_string())));
            ui.label(format!("Host: {}", System::host_name().unwrap_or_else(|| "Unknown".to_string())));
            ui.label(format!("Uptime: {} seconds", System::uptime()));
        });
        
        ui.add_space(10.0);
        
        // CPU Information
        ui.group(|ui| {
            ui.heading("CPU Information");
            let cpu = sys.global_cpu_info();
            ui.label(format!("Usage: {:.2}%", cpu.cpu_usage()));
            ui.label(format!("Cores: {}", sys.cpus().len()));
        });
        
        ui.add_space(10.0);
        
        // Memory Information
        ui.group(|ui| {
            ui.heading("Memory Information");
            ui.label(format!("Total: {:.2} GB", sys.total_memory() as f64 / 1_073_741_824.0));
            ui.label(format!("Used: {:.2} GB", sys.used_memory() as f64 / 1_073_741_824.0));
            ui.label(format!("Available: {:.2} GB", sys.available_memory() as f64 / 1_073_741_824.0));
        });
        
        ui.add_space(10.0);
        
        // Process List
        ui.group(|ui| {
            ui.heading("Running Processes");
            egui::ScrollArea::vertical().max_height(200.0).show(ui, |ui| {
                for (pid, process) in sys.processes() {
                    ui.horizontal(|ui| {
                        ui.label(format!("{}", pid));
                        ui.label(process.name());
                        ui.label(format!("{:.1}%", process.cpu_usage()));
                    });
                }
            });
        });
    }
    
    fn show_clients(&mut self, ui: &mut egui::Ui) {
        ui.heading("👥 Connected Clients");
        ui.separator();
        
        let clients = self.connected_clients.lock().unwrap().clone();
        let server_info = self.server_info.lock().unwrap().clone();
        
        // Connection Info
        ui.group(|ui| {
            ui.heading("📡 Connection Information");
            ui.label(format!("🌐 ZeroTier IP: {}", server_info.zerotier_ip));
            ui.label(format!("🆔 Node ID: {}", self.node_id));
            ui.label(format!("📊 Discovery Status: {}", 
                if self.discovery_service.is_some() { "Active" } else { "Inactive" }
            ));
        });
        
        ui.add_space(10.0);
        
        // Client List
        ui.group(|ui| {
            ui.heading("📋 Discovered Clients");
            
            if clients.is_empty() {
                ui.label("👥 No clients discovered yet");
                ui.label("💡 Clients will appear here when they join the network");
            } else {
                ui.label(format!("Found {} client(s):", clients.len()));
                
                egui::ScrollArea::vertical().max_height(300.0).show(ui, |ui| {
                    for client in &clients {
                        ui.group(|ui| {
                            ui.horizontal(|ui| {
                                ui.colored_label(egui::Color32::GREEN, "🟢");
                                ui.label(format!("Client: {}", &client.node_id[..8]));
                                
                                ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                                    if ui.button("📋 Copy IP").clicked() {
                                        let ip = client.zerotier_ip.as_ref()
                                            .unwrap_or(&client.ip_address);
                                        ui.output_mut(|o| o.copied_text = ip.clone());
                                    }
                                    
                                    if ui.button("🔗 Connect SSH").clicked() {
                                        let ip = client.zerotier_ip.as_ref()
                                            .unwrap_or(&client.ip_address);
                                        let ssh_cmd = format!("gnome-terminal -- ssh rental@{}", ip);
                                        let _ = Command::new("sh").arg("-c").arg(&ssh_cmd).spawn();
                                    }
                                });
                            });
                            
                            ui.label(format!("📍 IP: {}", 
                                client.zerotier_ip.as_ref().unwrap_or(&client.ip_address)
                            ));
                            
                            if let Some(zt_ip) = &client.zerotier_ip {
                                ui.label(format!("🌐 ZeroTier: {}", zt_ip));
                            }
                            
                            ui.label(format!("⏰ Last seen: {} seconds ago", 
                                std::time::SystemTime::now()
                                    .duration_since(std::time::UNIX_EPOCH)
                                    .unwrap()
                                    .as_secs() - client.timestamp
                            ));
                        });
                    }
                });
            }
        });
        
        ui.add_space(10.0);
        
        // Actions
        ui.group(|ui| {
            ui.heading("🛠️ Client Actions");
            ui.horizontal(|ui| {
                if ui.button("🔄 Refresh Discovery").clicked() {
                    // Force refresh discovery
                    self.update_discovery_service();
                }
                
                if ui.button("📤 Broadcast Availability").clicked() {
                    // Force send advertisement
                    if let Some(ref service_arc) = self.discovery_service {
                        if let Ok(mut service) = service_arc.lock() {
                            service.update_status(NodeStatus::Available);
                        }
                    }
                }
                
                if ui.button("📋 Export Client List").clicked() {
                    // Could implement client list export
                }
            });
        });
        
        // Manual Connection
        ui.add_space(10.0);
        ui.group(|ui| {
            ui.heading("🔗 Manual Connection");
            ui.label("Share this information with clients:");
            
            ui.group(|ui| {
                ui.horizontal(|ui| {
                    ui.monospace(format!("ssh rental@{}", server_info.zerotier_ip));
                    if ui.button("📋").clicked() {
                        let ssh_cmd = format!("ssh rental@{}", server_info.zerotier_ip);
                        ui.output_mut(|o| o.copied_text = ssh_cmd);
                    }
                });
                
                ui.horizontal(|ui| {
                    ui.monospace("Password: rental_user_2024");
                    if ui.button("📋").clicked() {
                        ui.output_mut(|o| o.copied_text = "rental_user_2024".to_string());
                    }
                });
                
                ui.horizontal(|ui| {
                    ui.monospace(format!("Node ID: {}", self.node_id));
                    if ui.button("📋").clicked() {
                        ui.output_mut(|o| o.copied_text = self.node_id.clone());
                    }
                });
            });
        });
    }
    
    fn show_network(&mut self, ui: &mut egui::Ui) {
        ui.heading("🌐 Network Status");
        ui.separator();
        
        let server_info = self.server_info.lock().unwrap().clone();
        
        // ZeroTier Status
        ui.group(|ui| {
            ui.heading("ZeroTier Network");
            ui.label(format!("Network ID: {}", server_info.zerotier_network));
            ui.label(format!("Assigned IP: {}", server_info.zerotier_ip));
            ui.label(format!("Status: {}", if server_info.zerotier_ip != "Not assigned" { "Connected" } else { "Disconnected" }));
        });
        
        ui.add_space(10.0);
        
        // Network Interfaces - simplified for now
        ui.group(|ui| {
            ui.heading("Network Interfaces");
            ui.label("eth0 - Active");
            ui.label("lo - Loopback");
        });
        
        ui.add_space(10.0);
        
        // Connection Info
        ui.group(|ui| {
            ui.heading("Connection Information");
            ui.label("For clients to connect:");
            ui.horizontal(|ui| {
                let ssh_cmd = format!("ssh rental@{}", server_info.zerotier_ip);
                ui.monospace(&ssh_cmd);
                if ui.button("📋").clicked() {
                    ui.output_mut(|o| o.copied_text = ssh_cmd);
                }
            });
            ui.label("Password: rental_user_2024");
        });
    }
    
    fn show_ssh_users(&mut self, ui: &mut egui::Ui) {
        ui.heading("🔐 SSH User Management");
        ui.separator();
        
        // Current active user
        ui.group(|ui| {
            ui.heading("Current Active User");
            if let Some(current_user) = self.ssh_manager.get_current_user() {
                ui.label(format!("👤 Active SSH User: {}", current_user));
                ui.label("🔒 Status: ONE USER ONLY - No other SSH access allowed");
                
                // Show terminate button
                ui.horizontal(|ui| {
                    if ui.button("🛑 Terminate Access").clicked() {
                        // Find job ID for this user
                        let active_jobs = self.ssh_manager.get_active_jobs();
                        if let Some(job) = active_jobs.iter().find(|j| j.ssh_user.username == current_user) {
                            let ssh_manager = self.ssh_manager.clone();
                            let job_id = job.job_id.clone();
                            tokio::spawn(async move {
                                if let Err(e) = ssh_manager.remove_job_user(&job_id).await {
                                    eprintln!("Failed to remove SSH user: {}", e);
                                }
                            });
                        }
                    }
                });
            } else {
                ui.label("🟢 No active SSH user - Rental node available");
                ui.label("✅ Ready to accept new job assignments");
            }
        });
        
        ui.add_space(10.0);
        
        // Active jobs list
        ui.group(|ui| {
            ui.heading("Active Job Sessions");
            
            let active_jobs = self.ssh_manager.get_active_jobs();
            
            if active_jobs.is_empty() {
                ui.label("📋 No active job sessions");
            } else {
                egui::ScrollArea::vertical().show(ui, |ui| {
                    for job in &active_jobs {
                        ui.group(|ui| {
                            ui.horizontal(|ui| {
                                ui.vertical(|ui| {
                                    ui.strong(format!("Job: {}", job.job_id));
                                    ui.label(format!("👤 SSH User: {}", job.ssh_user.username));
                                    ui.label(format!("👨‍💻 Client: {}", job.client_id));
                                });
                                
                                ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                                    if ui.button("🛑 End Session").clicked() {
                                        let ssh_manager = self.ssh_manager.clone();
                                        let job_id = job.job_id.clone();
                                        tokio::spawn(async move {
                                            if let Err(e) = ssh_manager.remove_job_user(&job_id).await {
                                                eprintln!("Failed to remove SSH user: {}", e);
                                            }
                                        });
                                    }
                                });
                            });
                            
                            ui.separator();
                            
                            ui.horizontal(|ui| {
                                ui.label(format!("⏰ Created: {}", 
                                    job.ssh_user.created_at.format("%Y-%m-%d %H:%M:%S UTC")
                                ));
                                ui.label(format!("⏰ Expires: {}", 
                                    job.expires_at.format("%Y-%m-%d %H:%M:%S UTC")
                                ));
                            });
                            
                            // SSH connection info
                            ui.group(|ui| {
                                ui.heading("SSH Connection Info");
                                let server_info = self.server_info.lock().unwrap();
                                let ssh_cmd = format!("ssh {}@{}", 
                                    job.ssh_user.username, 
                                    server_info.ip_address
                                );
                                
                                ui.horizontal(|ui| {
                                    ui.label("Command:");
                                    ui.code(&ssh_cmd);
                                    if ui.button("📋").clicked() {
                                        ui.output_mut(|o| o.copied_text = ssh_cmd);
                                    }
                                });
                                
                                ui.label("🔐 User has system access with docker privileges");
                                ui.label("⚠️ Access will be automatically revoked when job ends");
                            });
                        });
                        ui.add_space(5.0);
                    }
                });
            }
        });
        
        ui.add_space(10.0);
        
        // Management actions
        ui.group(|ui| {
            ui.heading("🛠️ Management Actions");
            
            ui.horizontal(|ui| {
                if ui.button("🧹 Cleanup Expired Users").clicked() {
                    let ssh_manager = self.ssh_manager.clone();
                    tokio::spawn(async move {
                        match ssh_manager.cleanup_expired_users().await {
                            Ok(removed) => {
                                println!("Cleaned up {} expired users", removed.len());
                            }
                            Err(e) => {
                                eprintln!("Failed to cleanup expired users: {}", e);
                            }
                        }
                    });
                }
                
                if ui.button("🔄 Refresh Status").clicked() {
                    // Status is automatically refreshed via get_active_jobs()
                }
                
                if ui.button("🧪 Test Job Creation").clicked() {
                    let ssh_manager = self.ssh_manager.clone();
                    let test_job_id = format!("test_job_{}", uuid::Uuid::new_v4());
                    let test_client_id = "test_client_123".to_string();
                    
                    tokio::spawn(async move {
                        match ssh_manager.create_job_user(&test_job_id, &test_client_id, 1).await {
                            Ok(job_access) => {
                                println!("Created test SSH user: {}", job_access.ssh_user.username);
                            }
                            Err(e) => {
                                eprintln!("Failed to create test SSH user: {}", e);
                            }
                        }
                    });
                }
            });
            
            ui.add_space(5.0);
            ui.label("💡 Pro Tip: Only one SSH user can access this rental node at a time");
            ui.label("🔒 When a user connects, all other SSH access is blocked");
            ui.label("♻️ Users are automatically created when jobs start and deleted when jobs end");
        });
    }
    
    fn show_settings(&mut self, ui: &mut egui::Ui) {
        ui.heading("🔧 Settings");
        ui.separator();
        
        ui.group(|ui| {
            ui.heading("Server Settings");
            ui.checkbox(&mut self.settings.auto_start, "Auto-start server on boot");
            ui.checkbox(&mut self.settings.enable_gpu_sharing, "Enable GPU sharing");
            
            ui.add_space(10.0);
            
            ui.horizontal(|ui| {
                ui.label("Max CPU Usage:");
                ui.add(egui::Slider::new(&mut self.settings.max_cpu_usage, 10.0..=100.0).suffix("%"));
            });
            
            ui.horizontal(|ui| {
                ui.label("Max Memory Usage:");
                ui.add(egui::Slider::new(&mut self.settings.max_memory_usage, 10.0..=100.0).suffix("%"));
            });
        });
        
        ui.add_space(10.0);
        
        ui.group(|ui| {
            ui.heading("Pricing");
            ui.horizontal(|ui| {
                ui.label("Price per hour: $");
                ui.add(egui::DragValue::new(&mut self.settings.pricing_per_hour).speed(0.1));
            });
        });
        
        ui.add_space(20.0);
        
        ui.horizontal(|ui| {
            if ui.button("💾 Save Settings").clicked() {
                // Save settings
            }
            if ui.button("🔄 Reset to Defaults").clicked() {
                self.settings = RentalSettings::default();
            }
        });
    }
}

fn main() -> Result<(), eframe::Error> {
    env_logger::init();
    
    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_inner_size([1200.0, 800.0])
            .with_min_inner_size([900.0, 600.0])
            .with_icon(
                eframe::icon_data::from_png_bytes(&[]).unwrap_or_default(),
            ),
        ..Default::default()
    };
    
    eframe::run_native(
        "Eryzaa Rental Server",
        options,
        Box::new(|cc| Box::new(EryzaaRentalApp::new(cc))),
    )
}
