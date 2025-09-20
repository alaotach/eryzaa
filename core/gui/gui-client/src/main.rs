use eframe::egui;
use std::process::Command;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use std::io;
use tokio::runtime::Runtime;
use std::collections::HashMap;

pub struct EryzaaClientApp {
    // Connection state
    server_status: Arc<Mutex<ServerStatus>>,
    zerotier_ip: String,
    ssh_output: Arc<Mutex<String>>,
    
    // UI state
    selected_tab: Tab,
    selected_access_type: AccessType,
    deployment_mode: DeploymentMode,
    show_logs: bool,
    log_content: String,
    
    // Model training state
    available_models: Vec<ModelInfo>,
    selected_model: Option<String>,
    training_status: TrainingStatus,
    datasets: Vec<DatasetInfo>,
    selected_dataset: Option<String>,
    
    // Edge computing state
    gpu_nodes: Vec<GpuNode>,
    active_jobs: Vec<ComputeJob>,
    
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
            selected_access_type: AccessType::default(),
            deployment_mode: DeploymentMode::default(),
            show_logs: false,
            log_content: String::new(),
            available_models: vec![
                ModelInfo { name: "GPT-2".to_string(), size: "117M".to_string(), category: "Language".to_string() },
                ModelInfo { name: "BERT".to_string(), size: "110M".to_string(), category: "Language".to_string() },
                ModelInfo { name: "ResNet-50".to_string(), size: "25M".to_string(), category: "Vision".to_string() },
                ModelInfo { name: "YOLO-v8".to_string(), size: "43M".to_string(), category: "Detection".to_string() },
            ],
            selected_model: None,
            training_status: TrainingStatus::default(),
            datasets: vec![
                DatasetInfo { name: "ImageNet".to_string(), size: "150GB".to_string(), category: "Vision".to_string() },
                DatasetInfo { name: "COCO".to_string(), size: "20GB".to_string(), category: "Detection".to_string() },
                DatasetInfo { name: "WikiText".to_string(), size: "500MB".to_string(), category: "Language".to_string() },
            ],
            selected_dataset: None,
            gpu_nodes: vec![],
            active_jobs: vec![],
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
    AccessTypes,
    SSH,
    ModelTraining,
    EdgeComputing,
    Logs,
    Settings,
}

impl Default for Tab {
    fn default() -> Self {
        Tab::Dashboard
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum AccessType {
    SSH,
    ModelTraining,
    EdgeComputing,
}

impl Default for AccessType {
    fn default() -> Self {
        AccessType::SSH
    }
}

#[derive(Debug, Clone)]
pub struct ModelInfo {
    name: String,
    size: String,
    category: String,
}

#[derive(Debug, Clone)]
pub struct DatasetInfo {
    name: String,
    size: String,
    category: String,
}

#[derive(Debug, Clone)]
pub enum TrainingStatus {
    NotStarted,
    Preparing,
    Training { epoch: u32, total_epochs: u32, loss: f32 },
    Completed,
    Error(String),
}

impl Default for TrainingStatus {
    fn default() -> Self {
        TrainingStatus::NotStarted
    }
}

#[derive(Debug, Clone)]
pub struct GpuNode {
    id: String,
    name: String,
    gpu_count: u32,
    memory: String,
    status: String,
    price_per_hour: f32,
}

#[derive(Debug, Clone)]
pub struct ComputeJob {
    id: String,
    name: String,
    status: String,
    progress: f32,
    estimated_time: String,
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
    // Network settings
    zerotier_network_id: String,
    
    // SSH settings
    ssh_username: String,
    ssh_password: String,
    auto_connect_ssh: bool,
    
    // Hardware settings
    enable_gpu: bool,
    
    // AI Training settings
    auto_save_models: bool,
    default_epochs: u32,
    
    // Edge Computing settings
    auto_scale: bool,
    cost_optimization: bool,
    max_jobs: u32,
    
    // Blockchain settings
    wallet_address: String,
    avax_rpc_url: String,
    auto_approve_payments: bool,
    
    // Interface settings
    dark_mode: bool,
    show_notifications: bool,
    minimize_to_tray: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Settings {
            // Network settings
            zerotier_network_id: "363c67c55ad2489d".to_string(),
            
            // SSH settings
            ssh_username: "rental".to_string(),
            ssh_password: "rental_user_2024".to_string(),
            auto_connect_ssh: false,
            
            // Hardware settings
            enable_gpu: false,
            
            // AI Training settings
            auto_save_models: true,
            default_epochs: 100,
            
            // Edge Computing settings
            auto_scale: true,
            cost_optimization: true,
            max_jobs: 5,
            
            // Blockchain settings
            wallet_address: String::new(),
            avax_rpc_url: "https://api.avax.network/ext/bc/C/rpc".to_string(),
            auto_approve_payments: false,
            
            // Interface settings
            dark_mode: false,
            show_notifications: true,
            minimize_to_tray: false,
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
                ui.selectable_value(&mut self.selected_tab, Tab::AccessTypes, "🚀 Access Types");
                ui.selectable_value(&mut self.selected_tab, Tab::SSH, "💻 SSH");
                ui.selectable_value(&mut self.selected_tab, Tab::ModelTraining, "🧠 AI Training");
                ui.selectable_value(&mut self.selected_tab, Tab::EdgeComputing, "⚡ Edge Computing");
                ui.selectable_value(&mut self.selected_tab, Tab::Logs, "📋 Logs");
                ui.selectable_value(&mut self.selected_tab, Tab::Settings, "⚙️ Settings");
            });
        });
        
        egui::CentralPanel::default().show(ctx, |ui| {
            match self.selected_tab {
                Tab::Dashboard => self.show_dashboard(ui),
                Tab::AccessTypes => self.show_access_types(ui),
                Tab::SSH => self.show_ssh(ui),
                Tab::ModelTraining => self.show_model_training(ui),
                Tab::EdgeComputing => self.show_edge_computing(ui),
                Tab::Logs => self.show_logs(ui),
                Tab::Settings => self.show_settings(ui),
            }
        });
    }
}

impl EryzaaClientApp {
    fn show_dashboard(&mut self, ui: &mut egui::Ui) {
        ui.heading("📊 Eryzaa Dashboard");
        ui.separator();
        
        // Welcome section
        ui.group(|ui| {
            ui.horizontal(|ui| {
                ui.label("🌟 Welcome to Eryzaa - Decentralized Computing Platform");
            });
            ui.label("Choose from 3 types of computing access:");
        });
        
        ui.add_space(10.0);
        
        // Three access types overview
        ui.horizontal(|ui| {
            // SSH Access
            ui.group(|ui| {
                ui.vertical_centered(|ui| {
                    ui.heading("🖥️ SSH Access");
                    ui.label("Direct remote access to PCs");
                    ui.add_space(5.0);
                    if ui.button("Connect to PC").clicked() {
                        self.selected_tab = Tab::SSH;
                    }
                });
            });
            
            // Model Training
            ui.group(|ui| {
                ui.vertical_centered(|ui| {
                    ui.heading("🧠 AI Training");
                    ui.label("Train & run AI models");
                    ui.add_space(5.0);
                    if ui.button("Train Models").clicked() {
                        self.selected_tab = Tab::ModelTraining;
                    }
                });
            });
            
            // Edge Computing
            ui.group(|ui| {
                ui.vertical_centered(|ui| {
                    ui.heading("⚡ Edge Computing");
                    ui.label("Multi-GPU workloads");
                    ui.add_space(5.0);
                    if ui.button("Launch Jobs").clicked() {
                        self.selected_tab = Tab::EdgeComputing;
                    }
                });
            });
        });
        
        ui.add_space(20.0);
        
        // System status
        ui.heading("System Status");
        let status = self.server_status.lock().unwrap().clone();
        
        ui.group(|ui| {
            ui.horizontal(|ui| {
                match &status {
                    ServerStatus::NotDeployed => {
                        ui.colored_label(egui::Color32::GRAY, "⚫");
                        ui.label("Status: Ready to connect");
                    }
                    ServerStatus::Deploying => {
                        ui.colored_label(egui::Color32::YELLOW, "🟡");
                        ui.label("Status: Connecting...");
                        ui.spinner();
                    }
                    ServerStatus::Running(ip) => {
                        ui.colored_label(egui::Color32::GREEN, "🟢");
                        ui.label(format!("Status: Connected ({})", ip));
                    }
                    ServerStatus::Error(err) => {
                        ui.colored_label(egui::Color32::RED, "🔴");
                        ui.label(format!("Status: Error - {}", err));
                    }
                }
            });
        });
        
        // Quick stats
        ui.add_space(10.0);
        ui.horizontal(|ui| {
            ui.group(|ui| {
                ui.vertical_centered(|ui| {
                    ui.label("Available Models");
                    ui.heading(format!("{}", self.available_models.len()));
                });
            });
            ui.group(|ui| {
                ui.vertical_centered(|ui| {
                    ui.label("GPU Nodes");
                    ui.heading(format!("{}", self.gpu_nodes.len()));
                });
            });
            ui.group(|ui| {
                ui.vertical_centered(|ui| {
                    ui.label("Active Jobs");
                    ui.heading(format!("{}", self.active_jobs.len()));
                });
            });
        });
    }
    
    fn show_access_types(&mut self, ui: &mut egui::Ui) {
        ui.heading("🚀 Eryzaa Access Types");
        ui.separator();
        
        ui.label("Select the type of computing access you need:");
        ui.add_space(10.0);
        
        // Access type selection
        ui.horizontal(|ui| {
            ui.radio_value(&mut self.selected_access_type, AccessType::SSH, "🖥️ Direct SSH to PC");
            ui.radio_value(&mut self.selected_access_type, AccessType::ModelTraining, "🧠 Model Training & Inference");
            ui.radio_value(&mut self.selected_access_type, AccessType::EdgeComputing, "⚡ Edge Computing");
        });
        
        ui.add_space(20.0);
        
        // Show details based on selection
        match self.selected_access_type {
            AccessType::SSH => {
                ui.group(|ui| {
                    ui.heading("🖥️ Direct SSH Access");
                    ui.label("Get secure remote access to personal computers in the Eryzaa network.");
                    ui.add_space(5.0);
                    ui.label("Features:");
                    ui.label("• Secure SSH connections via ZeroTier");
                    ui.label("• Cross-platform terminal access");
                    ui.label("• File transfer capabilities");
                    ui.label("• Multiple OS support (Linux, Windows, macOS)");
                    ui.add_space(10.0);
                    
                    if ui.button("🚀 Go to SSH Access").clicked() {
                        self.selected_tab = Tab::SSH;
                    }
                });
            }
            AccessType::ModelTraining => {
                ui.group(|ui| {
                    ui.heading("🧠 Model Training & Inference");
                    ui.label("Train AI models with datasets or run direct inference on pre-trained models.");
                    ui.add_space(5.0);
                    ui.label("Features:");
                    ui.label("• Dataset management like Google Cloud Model Garden");
                    ui.label("• Pre-trained model library (GPT, BERT, ResNet, YOLO)");
                    ui.label("• Custom model training with your data");
                    ui.label("• Real-time inference API");
                    ui.label("• Performance monitoring and analytics");
                    ui.add_space(10.0);
                    
                    if ui.button("🧠 Go to AI Training").clicked() {
                        self.selected_tab = Tab::ModelTraining;
                    }
                });
            }
            AccessType::EdgeComputing => {
                ui.group(|ui| {
                    ui.heading("⚡ Edge Computing with Multiple GPUs");
                    ui.label("Run distributed workloads across multiple GPU nodes for maximum performance.");
                    ui.add_space(5.0);
                    ui.label("Features:");
                    ui.label("• Multi-GPU orchestration");
                    ui.label("• Containerized workloads with Docker");
                    ui.label("• Auto-scaling and load balancing");
                    ui.label("• Real-time performance monitoring");
                    ui.label("• Cost optimization across nodes");
                    ui.add_space(10.0);
                    
                    if ui.button("⚡ Go to Edge Computing").clicked() {
                        self.selected_tab = Tab::EdgeComputing;
                    }
                });
            }
        }
        
        ui.add_space(20.0);
        
        // Pricing information
        ui.heading("💰 Pricing (AVAX tokens)");
        ui.group(|ui| {
            ui.horizontal(|ui| {
                ui.label("🖥️ SSH Access:");
                ui.label("0.1 AVAX/hour");
            });
            ui.horizontal(|ui| {
                ui.label("🧠 Model Training:");
                ui.label("0.5-2.0 AVAX/hour (based on GPU)");
            });
            ui.horizontal(|ui| {
                ui.label("⚡ Edge Computing:");
                ui.label("1.0-5.0 AVAX/hour (based on node count)");
            });
        });
    }
    
    fn show_model_training(&mut self, ui: &mut egui::Ui) {
        ui.heading("🧠 AI Model Training & Inference");
        ui.separator();
        
        ui.horizontal(|ui| {
            // Left panel - Models and Datasets
            ui.vertical(|ui| {
                ui.group(|ui| {
                    ui.heading("📚 Available Models");
                    egui::ScrollArea::vertical().max_height(200.0).show(ui, |ui| {
                        for model in &self.available_models {
                            ui.horizontal(|ui| {
                                let is_selected = self.selected_model.as_ref() == Some(&model.name);
                                if ui.selectable_label(is_selected, &model.name).clicked() {
                                    self.selected_model = Some(model.name.clone());
                                }
                                ui.label(format!("({}) - {}", model.size, model.category));
                            });
                        }
                    });
                });
                
                ui.add_space(10.0);
                
                ui.group(|ui| {
                    ui.heading("📊 Available Datasets");
                    egui::ScrollArea::vertical().max_height(200.0).show(ui, |ui| {
                        for dataset in &self.datasets {
                            ui.horizontal(|ui| {
                                let is_selected = self.selected_dataset.as_ref() == Some(&dataset.name);
                                if ui.selectable_label(is_selected, &dataset.name).clicked() {
                                    self.selected_dataset = Some(dataset.name.clone());
                                }
                                ui.label(format!("({}) - {}", dataset.size, dataset.category));
                            });
                        }
                    });
                });
            });
            
            ui.separator();
            
            // Right panel - Training controls
            ui.vertical(|ui| {
                ui.heading("🚀 Training Configuration");
                
                if let Some(model) = &self.selected_model {
                    ui.label(format!("Selected Model: {}", model));
                } else {
                    ui.colored_label(egui::Color32::YELLOW, "⚠️ Select a model first");
                }
                
                if let Some(dataset) = &self.selected_dataset {
                    ui.label(format!("Selected Dataset: {}", dataset));
                } else {
                    ui.colored_label(egui::Color32::YELLOW, "⚠️ Select a dataset first");
                }
                
                ui.add_space(10.0);
                
                // Training status
                match &self.training_status {
                    TrainingStatus::NotStarted => {
                        if self.selected_model.is_some() && self.selected_dataset.is_some() {
                            if ui.button("🚀 Start Training").clicked() {
                                self.training_status = TrainingStatus::Preparing;
                                // Start training process
                            }
                        }
                    }
                    TrainingStatus::Preparing => {
                        ui.horizontal(|ui| {
                            ui.spinner();
                            ui.label("Preparing training environment...");
                        });
                    }
                    TrainingStatus::Training { epoch, total_epochs, loss } => {
                        ui.label(format!("Training: Epoch {}/{}", epoch, total_epochs));
                        ui.add(egui::ProgressBar::new(*epoch as f32 / *total_epochs as f32));
                        ui.label(format!("Current Loss: {:.4}", loss));
                        
                        if ui.button("⏹️ Stop Training").clicked() {
                            self.training_status = TrainingStatus::NotStarted;
                        }
                    }
                    TrainingStatus::Completed => {
                        ui.colored_label(egui::Color32::GREEN, "✅ Training completed!");
                        if ui.button("📥 Download Model").clicked() {
                            // Download trained model
                        }
                        if ui.button("🔄 Start New Training").clicked() {
                            self.training_status = TrainingStatus::NotStarted;
                        }
                    }
                    TrainingStatus::Error(err) => {
                        ui.colored_label(egui::Color32::RED, format!("❌ Error: {}", err));
                        if ui.button("🔄 Retry").clicked() {
                            self.training_status = TrainingStatus::NotStarted;
                        }
                    }
                }
                
                ui.add_space(20.0);
                
                // Inference section
                ui.group(|ui| {
                    ui.heading("🔮 Model Inference");
                    ui.label("Run inference on trained models");
                    
                    if ui.button("🚀 Launch Inference API").clicked() {
                        // Launch inference endpoint
                    }
                    
                    if ui.button("🧪 Test Inference").clicked() {
                        // Open inference testing interface
                    }
                });
            });
        });
    }
    
    fn show_edge_computing(&mut self, ui: &mut egui::Ui) {
        ui.heading("⚡ Edge Computing with Multi-GPU");
        ui.separator();
        
        ui.horizontal(|ui| {
            // Left panel - Available nodes
            ui.vertical(|ui| {
                ui.group(|ui| {
                    ui.heading("🖥️ Available GPU Nodes");
                    
                    if self.gpu_nodes.is_empty() {
                        // Add some sample nodes for demo
                        self.gpu_nodes = vec![
                            GpuNode {
                                id: "node1".to_string(),
                                name: "High-Performance A100".to_string(),
                                gpu_count: 8,
                                memory: "320GB".to_string(),
                                status: "Available".to_string(),
                                price_per_hour: 4.5,
                            },
                            GpuNode {
                                id: "node2".to_string(),
                                name: "RTX 4090 Cluster".to_string(),
                                gpu_count: 4,
                                memory: "96GB".to_string(),
                                status: "Available".to_string(),
                                price_per_hour: 2.8,
                            },
                            GpuNode {
                                id: "node3".to_string(),
                                name: "V100 Multi-Node".to_string(),
                                gpu_count: 16,
                                memory: "512GB".to_string(),
                                status: "Busy".to_string(),
                                price_per_hour: 6.2,
                            },
                        ];
                    }
                    
                    egui::ScrollArea::vertical().max_height(300.0).show(ui, |ui| {
                        for node in &self.gpu_nodes {
                            ui.group(|ui| {
                                ui.horizontal(|ui| {
                                    ui.label(&node.name);
                                    match node.status.as_str() {
                                        "Available" => ui.colored_label(egui::Color32::GREEN, "🟢 Available"),
                                        "Busy" => ui.colored_label(egui::Color32::RED, "🔴 Busy"),
                                        _ => ui.colored_label(egui::Color32::YELLOW, "🟡 Unknown"),
                                    };
                                });
                                ui.label(format!("GPUs: {} | Memory: {}", node.gpu_count, node.memory));
                                ui.label(format!("Price: {:.1} AVAX/hour", node.price_per_hour));
                                
                                if node.status == "Available" {
                                    if ui.button("🚀 Deploy Job").clicked() {
                                        // Deploy job to this node
                                        let job = ComputeJob {
                                            id: format!("job_{}", self.active_jobs.len() + 1),
                                            name: format!("Job on {}", node.name),
                                            status: "Running".to_string(),
                                            progress: 0.0,
                                            estimated_time: "2h 30m".to_string(),
                                        };
                                        self.active_jobs.push(job);
                                    }
                                }
                            });
                            ui.add_space(5.0);
                        }
                    });
                });
            });
            
            ui.separator();
            
            // Right panel - Active jobs
            ui.vertical(|ui| {
                ui.group(|ui| {
                    ui.heading("🔄 Active Compute Jobs");
                    
                    if self.active_jobs.is_empty() {
                        ui.label("No active jobs. Deploy a job to get started!");
                    } else {
                        egui::ScrollArea::vertical().max_height(300.0).show(ui, |ui| {
                            let mut jobs_to_remove = Vec::new();
                            
                            for (i, job) in self.active_jobs.iter_mut().enumerate() {
                                ui.group(|ui| {
                                    ui.horizontal(|ui| {
                                        ui.label(&job.name);
                                        ui.label(&job.status);
                                    });
                                    
                                    ui.add(egui::ProgressBar::new(job.progress));
                                    ui.label(format!("ETA: {}", job.estimated_time));
                                    
                                    ui.horizontal(|ui| {
                                        if ui.button("⏸️ Pause").clicked() {
                                            job.status = "Paused".to_string();
                                        }
                                        if ui.button("⏹️ Stop").clicked() {
                                            jobs_to_remove.push(i);
                                        }
                                        if ui.button("📊 Logs").clicked() {
                                            self.selected_tab = Tab::Logs;
                                        }
                                    });
                                });
                                ui.add_space(5.0);
                                
                                // Simulate progress
                                if job.status == "Running" && job.progress < 1.0 {
                                    job.progress += 0.001; // Slow progress simulation
                                }
                            }
                            
                            // Remove stopped jobs
                            for i in jobs_to_remove.into_iter().rev() {
                                self.active_jobs.remove(i);
                            }
                        });
                    }
                });
                
                ui.add_space(10.0);
                
                // Quick deployment templates
                ui.group(|ui| {
                    ui.heading("🚀 Quick Deploy Templates");
                    
                    if ui.button("🧠 PyTorch Training").clicked() {
                        // Deploy PyTorch training job
                    }
                    if ui.button("🔮 TensorFlow Inference").clicked() {
                        // Deploy TensorFlow inference
                    }
                    if ui.button("📊 Data Processing").clicked() {
                        // Deploy data processing job
                    }
                    if ui.button("🎮 Custom Container").clicked() {
                        // Deploy custom Docker container
                    }
                });
            });
        });
        
        ui.add_space(20.0);
        
        // Resource usage summary
        ui.group(|ui| {
            ui.heading("📊 Resource Usage Summary");
            ui.horizontal(|ui| {
                ui.label(format!("Active Jobs: {}", self.active_jobs.len()));
                ui.separator();
                let total_cost: f32 = self.active_jobs.len() as f32 * 2.5; // Estimated
                ui.label(format!("Estimated Cost: {:.1} AVAX/hour", total_cost));
                ui.separator();
                ui.label(format!("Available Nodes: {}", self.gpu_nodes.iter().filter(|n| n.status == "Available").count()));
            });
        });
    }
    
    fn show_ssh(&mut self, ui: &mut egui::Ui) {
        ui.heading("� Direct SSH Access to PCs");
        ui.separator();
        
        // Server discovery section
        ui.group(|ui| {
            ui.heading("🔍 Discover Available PCs");
            ui.label("Find PCs shared in the Eryzaa network:");
            
            ui.horizontal(|ui| {
                if ui.button("� Refresh Network").clicked() {
                    // Refresh network discovery
                }
                if ui.button("🌐 Join ZeroTier Network").clicked() {
                    // Join ZeroTier network
                }
            });
        });
        
        ui.add_space(10.0);
        
        let status = self.server_status.lock().unwrap().clone();
        
        // Available servers section
        ui.group(|ui| {
            ui.heading("🖥️ Available Servers");
            
            match &status {
                ServerStatus::Running(ip) => {
                    ui.group(|ui| {
                        ui.horizontal(|ui| {
                            ui.colored_label(egui::Color32::GREEN, "🟢");
                            ui.label(format!("Server: {}", ip));
                            ui.label("Ubuntu 22.04");
                            ui.label("4 CPU, 8GB RAM");
                        });
                        
                        ui.horizontal(|ui| {
                            if ui.button("�️ Open Terminal").clicked() {
                                self.open_ssh_terminal(ip);
                            }
                            if ui.button("📁 File Manager").clicked() {
                                // Open file manager over SSH
                            }
                            if ui.button("🌐 Web Desktop").clicked() {
                                // Open web-based desktop
                            }
                        });
                    });
                }
                ServerStatus::NotDeployed => {
                    ui.label("🔍 No servers found. Deploy a server or wait for network discovery.");
                    
                    ui.horizontal(|ui| {
                        if ui.button("� Deploy Test Server").clicked() {
                            self.deploy_server(DeploymentMode::Fast);
                        }
                        if ui.button("📡 Manual Connect").clicked() {
                            // Manual IP connection dialog
                        }
                    });
                }
                ServerStatus::Deploying => {
                    ui.horizontal(|ui| {
                        ui.spinner();
                        ui.label("Deploying test server...");
                    });
                }
                ServerStatus::Error(err) => {
                    ui.colored_label(egui::Color32::RED, format!("❌ Error: {}", err));
                }
            }
        });
        
        ui.add_space(10.0);
        
        // Connection tools
        ui.group(|ui| {
            ui.heading("�️ Connection Tools");
            
            ui.horizontal(|ui| {
                ui.text_edit_singleline(&mut self.zerotier_ip);
                if ui.button("🔗 Direct Connect").clicked() {
                    if !self.zerotier_ip.is_empty() {
                        self.open_ssh_terminal(&self.zerotier_ip);
                    }
                }
            });
            
            ui.label("Quick commands:");
            ui.group(|ui| {
                if let ServerStatus::Running(ip) = &status {
                    let ssh_cmd = format!("ssh {}@{}", self.settings.ssh_username, ip);
                    ui.horizontal(|ui| {
                        ui.monospace(&ssh_cmd);
                        if ui.button("📋").clicked() {
                            ui.output_mut(|o| o.copied_text = ssh_cmd);
                        }
                    });
                    
                    let scp_cmd = format!("scp file.txt {}@{}:/home/{}/", self.settings.ssh_username, ip, self.settings.ssh_username);
                    ui.horizontal(|ui| {
                        ui.monospace(&scp_cmd);
                        if ui.button("📋").clicked() {
                            ui.output_mut(|o| o.copied_text = scp_cmd);
                        }
                    });
                } else {
                    ui.label("Commands will appear when connected to a server");
                }
            });
        });
        
        ui.add_space(10.0);
        
        // Security and pricing info
        ui.horizontal(|ui| {
            ui.group(|ui| {
                ui.heading("🔐 Security");
                ui.label("• Encrypted SSH connections");
                ui.label("• Private ZeroTier network");
                ui.label("• No exposed public IPs");
                ui.label("• Key-based authentication");
            });
            
            ui.group(|ui| {
                ui.heading("💰 Pricing");
                ui.label("• 0.1 AVAX per hour");
                ui.label("• Pay only when connected");
                ui.label("• Automatic billing via smart contract");
                ui.label("• Transparent pricing");
            });
        });
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
        ui.heading("⚙️ Eryzaa Settings");
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
            ui.label("🧠 AI Training Settings");
            ui.checkbox(&mut self.settings.enable_gpu, "Enable GPU acceleration");
            ui.checkbox(&mut self.settings.auto_save_models, "Auto-save trained models");
            ui.horizontal(|ui| {
                ui.label("Default training epochs:");
                ui.add(egui::Slider::new(&mut self.settings.default_epochs, 1..=1000));
            });
        });
        
        ui.add_space(10.0);
        
        ui.group(|ui| {
            ui.label("⚡ Edge Computing Settings");
            ui.checkbox(&mut self.settings.auto_scale, "Enable auto-scaling");
            ui.checkbox(&mut self.settings.cost_optimization, "Enable cost optimization");
            ui.horizontal(|ui| {
                ui.label("Max simultaneous jobs:");
                ui.add(egui::Slider::new(&mut self.settings.max_jobs, 1..=10));
            });
        });
        
        ui.add_space(10.0);
        
        ui.group(|ui| {
            ui.label("💰 Avalanche Blockchain Settings");
            ui.horizontal(|ui| {
                ui.label("Wallet Address:");
                ui.text_edit_singleline(&mut self.settings.wallet_address);
            });
            ui.horizontal(|ui| {
                ui.label("RPC Endpoint:");
                ui.text_edit_singleline(&mut self.settings.avax_rpc_url);
            });
            ui.checkbox(&mut self.settings.auto_approve_payments, "Auto-approve small payments (< 1 AVAX)");
        });
        
        ui.add_space(10.0);
        
        ui.group(|ui| {
            ui.label("🎨 Interface Settings");
            ui.checkbox(&mut self.settings.dark_mode, "Dark mode");
            ui.checkbox(&mut self.settings.show_notifications, "Show notifications");
            ui.checkbox(&mut self.settings.minimize_to_tray, "Minimize to system tray");
        });
        
        ui.add_space(20.0);
        
        ui.horizontal(|ui| {
            if ui.button("💾 Save Settings").clicked() {
                // Save settings to file
                self.save_settings();
            }
            if ui.button("🔄 Reset to Defaults").clicked() {
                self.settings = Settings::default();
            }
            if ui.button("📁 Open Config Folder").clicked() {
                // Open configuration folder
            }
        });
        
        ui.add_space(10.0);
        
        // About section
        ui.group(|ui| {
            ui.label("ℹ️ About Eryzaa");
            ui.label("Version: 1.0.0");
            ui.label("Cross-platform decentralized computing platform");
            ui.horizontal(|ui| {
                if ui.button("🌐 Website").clicked() {
                    // Open website
                }
                if ui.button("📚 Documentation").clicked() {
                    // Open docs
                }
                if ui.button("🐛 Report Bug").clicked() {
                    // Open issue tracker
                }
            });
        });
    }
    
    fn save_settings(&self) {
        // Implementation for saving settings to file
        // This would typically serialize settings to JSON/TOML
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
