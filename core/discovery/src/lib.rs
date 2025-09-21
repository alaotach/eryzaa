use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::net::{IpAddr, SocketAddr, UdpSocket};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tokio::time;

/// Service discovery protocol for Eryzaa nodes
/// Allows rental nodes to advertise their availability and clients to discover them

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeAdvertisement {
    pub node_id: String,
    pub node_type: NodeType,
    pub ip_address: String,
    pub zerotier_ip: Option<String>,
    pub ssh_port: u16,
    pub api_port: u16,
    pub capabilities: NodeCapabilities,
    pub status: NodeStatus,
    pub timestamp: u64,
    pub network_id: String, // ZeroTier network ID
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum NodeType {
    Rental,
    Client,
    Coordinator,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeCapabilities {
    pub cpu_cores: u32,
    pub memory_gb: u32,
    pub gpu_count: u32,
    pub gpu_memory_gb: u32,
    pub disk_space_gb: u32,
    pub network_speed_mbps: u32,
    pub supports_docker: bool,
    pub supports_gpu: bool,
    pub max_concurrent_jobs: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum NodeStatus {
    Available,
    Busy,
    Maintenance,
    Offline,
}

/// Discovery service for managing node advertisements
pub struct DiscoveryService {
    local_node: NodeAdvertisement,
    discovered_nodes: Arc<Mutex<HashMap<String, NodeAdvertisement>>>,
    socket: Arc<UdpSocket>,
    running: Arc<Mutex<bool>>,
    multicast_addr: SocketAddr,
}

const DISCOVERY_PORT: u16 = 9999;
const MULTICAST_ADDR: &str = "239.255.255.250:9999"; // Local multicast address
const ADVERTISEMENT_INTERVAL: Duration = Duration::from_secs(30);
const NODE_TIMEOUT: Duration = Duration::from_secs(120);

impl DiscoveryService {
    /// Create a new discovery service
    pub fn new(local_node: NodeAdvertisement) -> Result<Self, Box<dyn std::error::Error>> {
        let socket = UdpSocket::bind(format!("0.0.0.0:{}", DISCOVERY_PORT))?;
        socket.set_broadcast(true)?;
        
        // Enable multicast for local network discovery
        #[cfg(unix)]
        {
            use std::os::unix::io::AsRawFd;
            let fd = socket.as_raw_fd();
            unsafe {
                let optval: libc::c_int = 1;
                libc::setsockopt(
                    fd,
                    libc::SOL_SOCKET,
                    libc::SO_REUSEADDR,
                    &optval as *const _ as *const libc::c_void,
                    std::mem::size_of_val(&optval) as libc::socklen_t,
                );
            }
        }
        
        let multicast_addr = MULTICAST_ADDR.parse()?;
        
        Ok(DiscoveryService {
            local_node,
            discovered_nodes: Arc::new(Mutex::new(HashMap::new())),
            socket: Arc::new(socket),
            running: Arc::new(Mutex::new(false)),
            multicast_addr,
        })
    }
    
    /// Start the discovery service
    pub fn start(&self) -> Result<(), Box<dyn std::error::Error>> {
        *self.running.lock().unwrap() = true;
        
        // Start advertisement thread
        self.start_advertisement_thread();
        
        // Start discovery listener thread  
        self.start_listener_thread();
        
        // Start cleanup thread
        self.start_cleanup_thread();
        
        Ok(())
    }
    
    /// Stop the discovery service
    pub fn stop(&self) {
        *self.running.lock().unwrap() = false;
    }
    
    /// Get all discovered nodes
    pub fn get_discovered_nodes(&self) -> HashMap<String, NodeAdvertisement> {
        self.discovered_nodes.lock().unwrap().clone()
    }
    
    /// Get nodes by type
    pub fn get_nodes_by_type(&self, node_type: NodeType) -> Vec<NodeAdvertisement> {
        self.discovered_nodes
            .lock()
            .unwrap()
            .values()
            .filter(|node| node.node_type == node_type)
            .cloned()
            .collect()
    }
    
    /// Get available rental nodes
    pub fn get_available_rentals(&self) -> Vec<NodeAdvertisement> {
        self.discovered_nodes
            .lock()
            .unwrap()
            .values()
            .filter(|node| {
                node.node_type == NodeType::Rental && node.status == NodeStatus::Available
            })
            .cloned()
            .collect()
    }
    
    /// Update local node status
    pub fn update_status(&mut self, status: NodeStatus) {
        self.local_node.status = status;
        self.local_node.timestamp = current_timestamp();
    }
    
    /// Update local node capabilities
    pub fn update_capabilities(&mut self, capabilities: NodeCapabilities) {
        self.local_node.capabilities = capabilities;
        self.local_node.timestamp = current_timestamp();
    }
    
    /// Manually discover nodes on ZeroTier network
    pub async fn discover_zerotier_nodes(&self, network_id: &str) -> Result<Vec<NodeAdvertisement>, Box<dyn std::error::Error>> {
        let mut discovered = Vec::new();
        
        // Get ZeroTier network members
        if let Ok(output) = tokio::process::Command::new("zerotier-cli")
            .args(&["listpeers"])
            .output()
            .await
        {
            let output_str = String::from_utf8_lossy(&output.stdout);
            
            for line in output_str.lines() {
                if line.contains(network_id) {
                    // Parse ZeroTier peer info and try to discover nodes
                    if let Some(ip) = self.extract_ip_from_zerotier_line(line) {
                        if let Ok(node) = self.probe_node(&ip).await {
                            discovered.push(node);
                        }
                    }
                }
            }
        }
        
        Ok(discovered)
    }
    
    /// Start the advertisement thread
    fn start_advertisement_thread(&self) {
        let socket = Arc::clone(&self.socket);
        let running = Arc::clone(&self.running);
        let multicast_addr = self.multicast_addr;
        let mut local_node = self.local_node.clone();
        
        thread::spawn(move || {
            while *running.lock().unwrap() {
                // Update timestamp
                local_node.timestamp = current_timestamp();
                
                // Serialize and broadcast advertisement
                if let Ok(data) = bincode::serialize(&local_node) {
                    let _ = socket.send_to(&data, multicast_addr);
                    
                    // Also try direct broadcast to common ZeroTier subnets
                    for subnet in &["10.242.0.255:9999", "10.243.0.255:9999", "192.168.191.255:9999"] {
                        if let Ok(addr) = subnet.parse::<SocketAddr>() {
                            let _ = socket.send_to(&data, addr);
                        }
                    }
                }
                
                thread::sleep(ADVERTISEMENT_INTERVAL);
            }
        });
    }
    
    /// Start the listener thread
    fn start_listener_thread(&self) {
        let socket = Arc::clone(&self.socket);
        let running = Arc::clone(&self.running);
        let discovered_nodes = Arc::clone(&self.discovered_nodes);
        let local_node_id = self.local_node.node_id.clone();
        
        thread::spawn(move || {
            let mut buffer = [0u8; 4096];
            
            // Set socket timeout for non-blocking behavior
            socket.set_read_timeout(Some(Duration::from_millis(1000))).ok();
            
            while *running.lock().unwrap() {
                match socket.recv_from(&mut buffer) {
                    Ok((size, addr)) => {
                        if let Ok(advertisement) = bincode::deserialize::<NodeAdvertisement>(&buffer[..size]) {
                            // Don't add ourselves
                            if advertisement.node_id != local_node_id {
                                // Validate advertisement age
                                if current_timestamp() - advertisement.timestamp < NODE_TIMEOUT.as_secs() {
                                    discovered_nodes
                                        .lock()
                                        .unwrap()
                                        .insert(advertisement.node_id.clone(), advertisement);
                                }
                            }
                        }
                    }
                    Err(_) => {
                        // Timeout or other error, continue
                    }
                }
            }
        });
    }
    
    /// Start the cleanup thread to remove stale nodes
    fn start_cleanup_thread(&self) {
        let discovered_nodes = Arc::clone(&self.discovered_nodes);
        let running = Arc::clone(&self.running);
        
        thread::spawn(move || {
            while *running.lock().unwrap() {
                let current_time = current_timestamp();
                
                discovered_nodes.lock().unwrap().retain(|_, node| {
                    current_time - node.timestamp < NODE_TIMEOUT.as_secs()
                });
                
                thread::sleep(Duration::from_secs(60)); // Cleanup every minute
            }
        });
    }
    
    /// Extract IP from ZeroTier line
    fn extract_ip_from_zerotier_line(&self, line: &str) -> Option<String> {
        // Parse ZeroTier CLI output to extract IP addresses
        let parts: Vec<&str> = line.split_whitespace().collect();
        
        // Look for IP addresses in various formats
        for part in parts {
            if part.contains('/') {
                if let Some(ip) = part.split('/').next() {
                    if self.is_valid_ip(ip) {
                        return Some(ip.to_string());
                    }
                }
            } else if self.is_valid_ip(part) {
                return Some(part.to_string());
            }
        }
        
        None
    }
    
    /// Check if string is a valid IP address
    fn is_valid_ip(&self, s: &str) -> bool {
        s.parse::<IpAddr>().is_ok()
    }
    
    /// Probe a specific IP for node information
    async fn probe_node(&self, ip: &str) -> Result<NodeAdvertisement, Box<dyn std::error::Error>> {
        // Try to connect to the discovery port and request node info
        let addr = format!("{}:{}", ip, DISCOVERY_PORT);
        let socket = tokio::net::UdpSocket::bind("0.0.0.0:0").await?;
        
        // Send discovery request
        let request = b"DISCOVER";
        socket.send_to(request, &addr).await?;
        
        // Wait for response with timeout
        let mut buffer = [0u8; 4096];
        match tokio::time::timeout(Duration::from_secs(5), socket.recv_from(&mut buffer)).await {
            Ok(Ok((size, _))) => {
                let advertisement = bincode::deserialize::<NodeAdvertisement>(&buffer[..size])?;
                Ok(advertisement)
            }
            _ => Err("No response from node".into()),
        }
    }
}

/// Get current timestamp in seconds
fn current_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs()
}

/// Helper function to create a rental node advertisement
pub fn create_rental_advertisement(
    node_id: String,
    ip_address: String,
    zerotier_ip: Option<String>,
    capabilities: NodeCapabilities,
    network_id: String,
) -> NodeAdvertisement {
    NodeAdvertisement {
        node_id,
        node_type: NodeType::Rental,
        ip_address,
        zerotier_ip,
        ssh_port: 22,
        api_port: 8080,
        capabilities,
        status: NodeStatus::Available,
        timestamp: current_timestamp(),
        network_id,
    }
}

/// Helper function to create a client node advertisement
pub fn create_client_advertisement(
    node_id: String,
    ip_address: String,
    zerotier_ip: Option<String>,
    network_id: String,
) -> NodeAdvertisement {
    NodeAdvertisement {
        node_id,
        node_type: NodeType::Client,
        ip_address,
        zerotier_ip,
        ssh_port: 22,
        api_port: 8080,
        capabilities: NodeCapabilities {
            cpu_cores: 0,
            memory_gb: 0,
            gpu_count: 0,
            gpu_memory_gb: 0,
            disk_space_gb: 0,
            network_speed_mbps: 0,
            supports_docker: false,
            supports_gpu: false,
            max_concurrent_jobs: 0,
        },
        status: NodeStatus::Available,
        timestamp: current_timestamp(),
        network_id,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_node_advertisement_serialization() {
        let capabilities = NodeCapabilities {
            cpu_cores: 8,
            memory_gb: 32,
            gpu_count: 1,
            gpu_memory_gb: 11,
            disk_space_gb: 1000,
            network_speed_mbps: 1000,
            supports_docker: true,
            supports_gpu: true,
            max_concurrent_jobs: 4,
        };
        
        let advertisement = create_rental_advertisement(
            "test-node-1".to_string(),
            "192.168.1.100".to_string(),
            Some("10.242.123.45".to_string()),
            capabilities,
            "363c67c55ad2489d".to_string(),
        );
        
        let serialized = bincode::serialize(&advertisement).unwrap();
        let deserialized: NodeAdvertisement = bincode::deserialize(&serialized).unwrap();
        
        assert_eq!(advertisement.node_id, deserialized.node_id);
        assert_eq!(advertisement.node_type, deserialized.node_type);
        assert_eq!(advertisement.ip_address, deserialized.ip_address);
    }
}
