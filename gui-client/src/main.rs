use eframe::egui;
use std::process::Command;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tokio::runtime::Runtime;

pub struct EryzaaClientApp {
    // Connection state
    server_status: Arc<Mutex<ServerStatus>>,
    zerotier_ip: String,
    ssh_output: Arc<Mutex<String>>,
    
    // UI state
    selected_tab: Tab,
    deployment_mode: DeploymentMode,
    show_logs: bool,
    log_content: String,
    
    // Settings
    settings: Settings,
    
    // Runtime
    runtime: Arc<Runtime>,
}

impl Default for EryzaaClientApp {
    fn default() -> Self {
        Self {
            server_status: Arc::new(Mutex::new(ServerStatus::default())),
            zerotier_ip: String::new(),
            ssh_output: Arc::new(Mutex::new(String::new())),
            selected_tab: Tab::default(),
            deployment_mode: DeploymentMode::default(),
            show_logs: false,
            log_content: String::new(),
            settings: Settings::default(),
            runtime: Arc::new(Runtime::new().unwrap()),
        }
    }
}

#[derive(Debug, Clone)]
pub enum ServerStatus {
    NotDeployed,
    Deploying,
    Running(String), // ZeroTier IP
    Error(String),
}

impl Default for ServerStatus {
    fn default() -> Self {
        ServerStatus::NotDeployed
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum Tab {
    Dashboard,
    Deploy,
    SSH,
    Logs,
    Settings,
}

impl Default for Tab {
    fn default() -> Self {
        Tab::Dashboard
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum DeploymentMode {
    Production,
    Development,
    Fast,
}

impl Default for DeploymentMode {
    fn default() -> Self {
        DeploymentMode::Fast
    }
}

#[derive(Debug, Clone)]
pub struct Settings {
    zerotier_network_id: String,
    ssh_username: String,
    ssh_password: String,
    auto_connect_ssh: bool,
    enable_gpu: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Settings {
            zerotier_network_id: "363c67c55ad2489d".to_string(),
            ssh_username: "rental".to_string(),
            ssh_password: "rental_user_2024".to_string(),
            auto_connect_ssh: false,
            enable_gpu: false,
        }
    }
}

impl EryzaaClientApp {
    pub fn new(_cc: &eframe::CreationContext<'_>) -> Self {
        let runtime = Arc::new(Runtime::new().expect("Failed to create Tokio runtime"));
        
        Self {
            runtime,
            ..Default::default()
        }
    }
    
    fn deploy_server(&mut self, mode: DeploymentMode) {
        let status = Arc::clone(&self.server_status);
        *status.lock().unwrap() = ServerStatus::Deploying;
        
        let mode_str = match mode {
            DeploymentMode::Production => "deploy",
            DeploymentMode::Development => "dev", 
            DeploymentMode::Fast => "fast",
        };
        
        thread::spawn(move || {
            let output = Command::new("./manage.sh")
                .arg(mode_str)
                .current_dir("../")
                .output();
                
            match output {
                Ok(result) => {
                    if result.status.success() {
                        // Get ZeroTier IP
                        thread::sleep(Duration::from_secs(5));
                        let ip_output = Command::new("docker")
                            .args(&["exec", "rental-dev", "zerotier-cli", "listnetworks"])
                            .output();
                            
                        if let Ok(ip_result) = ip_output {
                            let output_str = String::from_utf8_lossy(&ip_result.stdout);
                            for line in output_str.lines() {
                                if line.contains("363c67c55ad2489d") {
                                    let parts: Vec<&str> = line.split_whitespace().collect();
                                    if parts.len() > 6 {
                                        let ip = parts[6].split('/').next().unwrap_or("");
                                        if !ip.is_empty() && ip != "-" {
                                            *status.lock().unwrap() = ServerStatus::Running(ip.to_string());
                                            return;
                                        }
                                    }
                                }
                            }
                        }
                        *status.lock().unwrap() = ServerStatus::Running("Unknown".to_string());
                    } else {
                        let error = String::from_utf8_lossy(&result.stderr);
                        *status.lock().unwrap() = ServerStatus::Error(error.to_string());
                    }
                }
                Err(e) => {
                    *status.lock().unwrap() = ServerStatus::Error(e.to_string());
                }
            }
        });
    }
    
    fn stop_server(&mut self) {
        let status = Arc::clone(&self.server_status);
        
        thread::spawn(move || {
            let _output = Command::new("./manage.sh")
                .arg("stop")
                .current_dir("../")
                .output();
                
            *status.lock().unwrap() = ServerStatus::NotDeployed;
        });
    }
    
    fn get_server_logs(&mut self) {
        // Server logs are now shown directly in the UI, no need for complex async handling
        // This function can be simplified or removed
    }
    
    fn open_ssh_terminal(&self, ip: &str) {
        let ssh_command = format!(
            "gnome-terminal -- bash -c 'echo \"Connecting to Eryzaa Server...\"; ssh -o StrictHostKeyChecking=no {}@{}; exec bash'",
            self.settings.ssh_username, ip
        );
        
        let _ = Command::new("sh")
            .arg("-c")
            .arg(&ssh_command)
            .spawn();
    }
}

impl eframe::App for EryzaaClientApp {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        // Update every second
        ctx.request_repaint_after(Duration::from_secs(1));
        
        egui::TopBottomPanel::top("top_panel").show(ctx, |ui| {
            egui::menu::bar(ui, |ui| {
                ui.heading("🚀 Eryzaa Client");
                ui.separator();
                
                ui.selectable_value(&mut self.selected_tab, Tab::Dashboard, "📊 Dashboard");
                ui.selectable_value(&mut self.selected_tab, Tab::Deploy, "🚀 Deploy");
                ui.selectable_value(&mut self.selected_tab, Tab::SSH, "💻 SSH");
                ui.selectable_value(&mut self.selected_tab, Tab::Logs, "📋 Logs");
                ui.selectable_value(&mut self.selected_tab, Tab::Settings, "⚙️ Settings");
            });
        });
        
        egui::CentralPanel::default().show(ctx, |ui| {
            match self.selected_tab {
                Tab::Dashboard => self.show_dashboard(ui),
                Tab::Deploy => self.show_deploy(ui),
                Tab::SSH => self.show_ssh(ui),
                Tab::Logs => self.show_logs(ui),
                Tab::Settings => self.show_settings(ui),
            }
        });
    }
}

impl EryzaaClientApp {
    fn show_dashboard(&mut self, ui: &mut egui::Ui) {
        ui.heading("📊 Dashboard");
        ui.separator();
        
        let status = self.server_status.lock().unwrap().clone();
        
        // Server Status Card
        ui.group(|ui| {
            ui.horizontal(|ui| {
                match &status {
                    ServerStatus::NotDeployed => {
                        ui.colored_label(egui::Color32::GRAY, "⚫");
                        ui.label("Server: Not Deployed");
                        if ui.button("🚀 Quick Deploy").clicked() {
                            self.deploy_server(DeploymentMode::Fast);
                        }
                    }
                    ServerStatus::Deploying => {
                        ui.colored_label(egui::Color32::YELLOW, "🟡");
                        ui.label("Server: Deploying...");
                        ui.spinner();
                    }
                    ServerStatus::Running(ip) => {
                        ui.colored_label(egui::Color32::GREEN, "🟢");
                        ui.label(format!("Server: Running ({})", ip));
                        if ui.button("💻 Connect SSH").clicked() {
                            self.open_ssh_terminal(ip);
                        }
                        if ui.button("🛑 Stop").clicked() {
                            self.stop_server();
                        }
                    }
                    ServerStatus::Error(err) => {
                        ui.colored_label(egui::Color32::RED, "🔴");
                        ui.label("Server: Error");
                        ui.label(err);
                    }
                }
            });
        });
        
        ui.add_space(10.0);
        
        // Quick Actions
        ui.heading("Quick Actions");
        ui.horizontal(|ui| {
            if ui.button("🏠 Deploy Development Server").clicked() {
                self.deploy_server(DeploymentMode::Fast);
            }
            if ui.button("🏭 Deploy Production Server").clicked() {
                self.deploy_server(DeploymentMode::Production);
            }
        });
        
        if let ServerStatus::Running(ip) = &status {
            ui.add_space(10.0);
            ui.heading("Connection Info");
            ui.group(|ui| {
                ui.label(format!("🌐 ZeroTier IP: {}", ip));
                ui.label(format!("👤 Username: {}", self.settings.ssh_username));
                ui.label("🔑 Password: [Hidden]");
                
                if ui.button("📋 Copy SSH Command").clicked() {
                    let ssh_cmd = format!("ssh {}@{}", self.settings.ssh_username, ip);
                    ui.output_mut(|o| o.copied_text = ssh_cmd);
                }
            });
        }
    }
    
    fn show_deploy(&mut self, ui: &mut egui::Ui) {
        ui.heading("🚀 Deploy Server");
        ui.separator();
        
        ui.label("Choose deployment mode:");
        
        ui.group(|ui| {
            ui.radio_value(&mut self.deployment_mode, DeploymentMode::Fast, "⚡ Fast Development");
            ui.label("   Minimal setup, fastest startup (~1 minute)");
            
            ui.radio_value(&mut self.deployment_mode, DeploymentMode::Development, "🔧 Full Development");
            ui.label("   Complete development environment with tools");
            
            ui.radio_value(&mut self.deployment_mode, DeploymentMode::Production, "🏭 Production");
            ui.label("   Full production setup with GPU support");
        });
        
        ui.add_space(20.0);
        
        let status = self.server_status.lock().unwrap().clone();
        
        match &status {
            ServerStatus::NotDeployed => {
                if ui.button("🚀 Deploy Server").clicked() {
                    self.deploy_server(self.deployment_mode.clone());
                }
            }
            ServerStatus::Deploying => {
                ui.horizontal(|ui| {
                    ui.spinner();
                    ui.label("Deploying server...");
                });
            }
            ServerStatus::Running(_) => {
                ui.label("✅ Server is running!");
                if ui.button("🔄 Redeploy").clicked() {
                    self.stop_server();
                    thread::sleep(Duration::from_millis(500));
                    self.deploy_server(self.deployment_mode.clone());
                }
                if ui.button("🛑 Stop Server").clicked() {
                    self.stop_server();
                }
            }
            ServerStatus::Error(err) => {
                ui.colored_label(egui::Color32::RED, format!("❌ Error: {}", err));
                if ui.button("🔄 Retry Deploy").clicked() {
                    self.deploy_server(self.deployment_mode.clone());
                }
            }
        }
    }
    
    fn show_ssh(&mut self, ui: &mut egui::Ui) {
        ui.heading("💻 SSH Terminal");
        ui.separator();
        
        let status = self.server_status.lock().unwrap().clone();
        
        if let ServerStatus::Running(ip) = &status {
            ui.group(|ui| {
                ui.label(format!("Server IP: {}", ip));
                ui.label(format!("Username: {}", self.settings.ssh_username));
                
                ui.horizontal(|ui| {
                    if ui.button("🖥️ Open Terminal").clicked() {
                        self.open_ssh_terminal(ip);
                    }
                    if ui.button("🌐 Open Web Terminal").clicked() {
                        // Could implement web-based terminal here
                    }
                });
            });
            
            ui.add_space(10.0);
            ui.label("SSH Commands:");
            ui.group(|ui| {
                let ssh_cmd = format!("ssh {}@{}", self.settings.ssh_username, ip);
                ui.horizontal(|ui| {
                    ui.monospace(&ssh_cmd);
                    if ui.button("📋").clicked() {
                        ui.output_mut(|o| o.copied_text = ssh_cmd);
                    }
                });
                
                let scp_cmd = format!("scp file.txt {}@{}:/workspace/", self.settings.ssh_username, ip);
                ui.horizontal(|ui| {
                    ui.monospace(&scp_cmd);
                    if ui.button("📋").clicked() {
                        ui.output_mut(|o| o.copied_text = scp_cmd);
                    }
                });
            });
        } else {
            ui.label("⚠️ Server must be running to use SSH");
            ui.label("Deploy a server from the Deploy tab first.");
        }
    }
    
    fn show_logs(&mut self, ui: &mut egui::Ui) {
        ui.heading("📋 Server Logs");
        ui.separator();
        
        ui.horizontal(|ui| {
            if ui.button("🔄 Refresh Logs").clicked() {
                self.get_server_logs();
            }
            if ui.button("📥 Export Logs").clicked() {
                // Could implement log export here
            }
        });
        
        ui.add_space(10.0);
        
        egui::ScrollArea::vertical()
            .max_height(400.0)
            .show(ui, |ui| {
                ui.text_edit_multiline(&mut self.log_content);
            });
    }
    
    fn show_settings(&mut self, ui: &mut egui::Ui) {
        ui.heading("⚙️ Settings");
        ui.separator();
        
        ui.group(|ui| {
            ui.label("🌐 Network Settings");
            ui.horizontal(|ui| {
                ui.label("ZeroTier Network ID:");
                ui.text_edit_singleline(&mut self.settings.zerotier_network_id);
            });
        });
        
        ui.add_space(10.0);
        
        ui.group(|ui| {
            ui.label("🔐 SSH Settings");
            ui.horizontal(|ui| {
                ui.label("Username:");
                ui.text_edit_singleline(&mut self.settings.ssh_username);
            });
            ui.horizontal(|ui| {
                ui.label("Password:");
                ui.text_edit_singleline(&mut self.settings.ssh_password);
            });
            ui.checkbox(&mut self.settings.auto_connect_ssh, "Auto-connect SSH after deployment");
        });
        
        ui.add_space(10.0);
        
        ui.group(|ui| {
            ui.label("🖥️ Hardware Settings");
            ui.checkbox(&mut self.settings.enable_gpu, "Enable GPU support");
        });
        
        ui.add_space(20.0);
        
        ui.horizontal(|ui| {
            if ui.button("💾 Save Settings").clicked() {
                // Save settings to file
            }
            if ui.button("🔄 Reset to Defaults").clicked() {
                self.settings = Settings::default();
            }
        });
    }
}

fn main() -> Result<(), eframe::Error> {
    env_logger::init();
    
    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_inner_size([1000.0, 700.0])
            .with_min_inner_size([800.0, 600.0])
            .with_icon(
                // Add an icon here if you have one
                eframe::icon_data::from_png_bytes(&[]).unwrap_or_default(),
            ),
        ..Default::default()
    };
    
    eframe::run_native(
        "Eryzaa Client",
        options,
        Box::new(|cc| Box::new(EryzaaClientApp::new(cc))),
    )
}
