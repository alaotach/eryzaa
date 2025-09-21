use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::process::Command;
use std::sync::{Arc, Mutex};
use uuid::Uuid;
use log::{info, warn, error};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SshUser {
    pub username: String,
    pub job_id: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub is_active: bool,
    pub ssh_key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobAccess {
    pub job_id: String,
    pub client_id: String,
    pub ssh_user: SshUser,
    pub expires_at: chrono::DateTime<chrono::Utc>,
}

pub struct SshManager {
    active_users: Arc<Mutex<HashMap<String, JobAccess>>>,
    current_user: Arc<Mutex<Option<String>>>, // Only one user at a time
}

impl SshManager {
    pub fn new() -> Self {
        Self {
            active_users: Arc::new(Mutex::new(HashMap::new())),
            current_user: Arc::new(Mutex::new(None)),
        }
    }

    /// Create a new SSH user for a job
    pub async fn create_job_user(&self, job_id: &str, client_id: &str, duration_hours: u64) -> Result<JobAccess, String> {
        let mut current_user = self.current_user.lock().unwrap();
        
        // Check if there's already an active user
        if current_user.is_some() {
            return Err("Another user is currently accessing this rental node".to_string());
        }

        let uuid_str = Uuid::new_v4().to_string().replace("-", "");
        let username = format!("job_{}", &uuid_str[..8]);
        let password = self.generate_secure_password();
        
        // Create the system user
        match self.create_system_user(&username, &password).await {
            Ok(_) => {
                let expires_at = chrono::Utc::now() + chrono::Duration::hours(duration_hours as i64);
                
                let ssh_user = SshUser {
                    username: username.clone(),
                    job_id: job_id.to_string(),
                    created_at: chrono::Utc::now(),
                    is_active: true,
                    ssh_key: None, // Could add SSH key support later
                };

                let job_access = JobAccess {
                    job_id: job_id.to_string(),
                    client_id: client_id.to_string(),
                    ssh_user: ssh_user.clone(),
                    expires_at,
                };

                // Set as current user
                *current_user = Some(username.clone());
                
                // Store in active users
                let mut active_users = self.active_users.lock().unwrap();
                active_users.insert(job_id.to_string(), job_access.clone());

                info!("Created SSH user '{}' for job '{}' (client: {})", username, job_id, client_id);
                Ok(job_access)
            }
            Err(e) => {
                error!("Failed to create SSH user for job '{}': {}", job_id, e);
                Err(e)
            }
        }
    }

    /// Remove SSH user when job ends
    pub async fn remove_job_user(&self, job_id: &str) -> Result<(), String> {
        let mut active_users = self.active_users.lock().unwrap();
        let mut current_user = self.current_user.lock().unwrap();

        if let Some(job_access) = active_users.remove(job_id) {
            let username = &job_access.ssh_user.username;
            
            // Remove from current user if it matches
            if let Some(ref current) = *current_user {
                if current == username {
                    *current_user = None;
                }
            }

            // Delete the system user
            match self.delete_system_user(username).await {
                Ok(_) => {
                    info!("Removed SSH user '{}' for job '{}'", username, job_id);
                    Ok(())
                }
                Err(e) => {
                    error!("Failed to delete SSH user '{}': {}", username, e);
                    Err(e)
                }
            }
        } else {
            warn!("No SSH user found for job '{}'", job_id);
            Err(format!("No SSH user found for job '{}'", job_id))
        }
    }

    /// Get current active user
    pub fn get_current_user(&self) -> Option<String> {
        self.current_user.lock().unwrap().clone()
    }

    /// Get all active job accesses
    pub fn get_active_jobs(&self) -> Vec<JobAccess> {
        self.active_users.lock().unwrap().values().cloned().collect()
    }

    /// Check if a user can access (for SSH login validation)
    pub fn validate_user_access(&self, username: &str) -> bool {
        let active_users = self.active_users.lock().unwrap();
        active_users.values().any(|access| {
            access.ssh_user.username == username && 
            access.ssh_user.is_active && 
            access.expires_at > chrono::Utc::now()
        })
    }

    /// Clean up expired users
    pub async fn cleanup_expired_users(&self) -> Result<Vec<String>, String> {
        let mut removed_jobs = Vec::new();
        let active_users = {
            let users = self.active_users.lock().unwrap();
            users.clone()
        };

        for (job_id, access) in active_users {
            if access.expires_at <= chrono::Utc::now() {
                info!("Cleaning up expired user for job '{}'", job_id);
                if let Err(e) = self.remove_job_user(&job_id).await {
                    error!("Failed to cleanup expired user for job '{}': {}", job_id, e);
                } else {
                    removed_jobs.push(job_id);
                }
            }
        }

        Ok(removed_jobs)
    }

    /// Generate a secure random password
    fn generate_secure_password(&self) -> String {
        use rand::Rng;
        const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
        let mut rng = rand::thread_rng();
        
        (0..16)
            .map(|_| {
                let idx = rng.gen_range(0..CHARSET.len());
                CHARSET[idx] as char
            })
            .collect()
    }

    /// Create a system user with sudo privileges for job access
    async fn create_system_user(&self, username: &str, password: &str) -> Result<(), String> {
        // Try to use the privileged service first
        if let Ok(()) = self.create_user_via_service(username, password).await {
            return Ok(());
        }
        
        // Fallback to direct sudo (will fail in GUI without proper setup)
        warn!("Service unavailable, trying direct sudo (may fail in GUI)");
        self.create_user_direct(username, password).await
    }
    
    /// Create user via privileged service (recommended)
    async fn create_user_via_service(&self, username: &str, password: &str) -> Result<(), String> {
        use std::fs::OpenOptions;
        use std::io::Write;
        
        let socket_path = "/tmp/eryzaa_ssh_service.sock";
        let response_path = "/tmp/eryzaa_ssh_service.sock.response";
        
        // Check if service is running
        if !std::path::Path::new(socket_path).exists() {
            return Err("SSH management service not running".to_string());
        }
        
        // Send request to service
        let request = format!("create|{}|{}", username, password);
        
        match OpenOptions::new().write(true).open(socket_path) {
            Ok(mut file) => {
                if let Err(e) = writeln!(file, "{}", request) {
                    return Err(format!("Failed to write to service socket: {}", e));
                }
            }
            Err(e) => return Err(format!("Failed to open service socket: {}", e)),
        }
        
        // Wait for response (with timeout)
        for _ in 0..50 { // 5 second timeout
            if std::path::Path::new(response_path).exists() {
                match std::fs::read_to_string(response_path) {
                    Ok(response) => {
                        std::fs::remove_file(response_path).ok(); // Cleanup
                        if response.trim() == "SUCCESS" {
                            info!("Created system user '{}' via service", username);
                            return Ok(());
                        } else {
                            return Err(format!("Service error: {}", response.trim()));
                        }
                    }
                    Err(_) => continue,
                }
            }
            std::thread::sleep(std::time::Duration::from_millis(100));
        }
        
        Err("Service timeout".to_string())
    }
    
    /// Direct sudo method (fallback)
    async fn create_user_direct(&self, username: &str, password: &str) -> Result<(), String> {
    /// Direct sudo method (fallback)
    async fn create_user_direct(&self, username: &str, password: &str) -> Result<(), String> {
        // Create user
        let create_output = Command::new("sudo")
            .args(&["useradd", "-m", "-s", "/bin/bash", username])
            .output()
            .map_err(|e| format!("Failed to execute useradd: {}", e))?;

        if !create_output.status.success() {
            return Err(format!("Failed to create user: {}", String::from_utf8_lossy(&create_output.stderr)));
        }

        // Set password
        let passwd_output = Command::new("sudo")
            .args(&["chpasswd"])
            .arg(format!("{}:{}", username, password))
            .output()
            .map_err(|e| format!("Failed to execute chpasswd: {}", e))?;

        if !passwd_output.status.success() {
            return Err(format!("Failed to set password: {}", String::from_utf8_lossy(&passwd_output.stderr)));
        }

        // Add to docker group for container access
        let docker_output = Command::new("sudo")
            .args(&["usermod", "-aG", "docker", username])
            .output()
            .map_err(|e| format!("Failed to add user to docker group: {}", e))?;

        if !docker_output.status.success() {
            warn!("Failed to add user to docker group: {}", String::from_utf8_lossy(&docker_output.stderr));
        }

        info!("Created system user '{}' with password", username);
        Ok(())
    }

    /// Delete a system user
    async fn delete_system_user(&self, username: &str) -> Result<(), String> {
        // Try service first
        if let Ok(()) = self.delete_user_via_service(username).await {
            return Ok(());
        }
        
        // Fallback to direct sudo
        warn!("Service unavailable, trying direct sudo (may fail in GUI)");
        self.delete_user_direct(username).await
    }
    
    /// Delete user via privileged service
    async fn delete_user_via_service(&self, username: &str) -> Result<(), String> {
        use std::fs::OpenOptions;
        use std::io::Write;
        
        let socket_path = "/tmp/eryzaa_ssh_service.sock";
        let response_path = "/tmp/eryzaa_ssh_service.sock.response";
        
        if !std::path::Path::new(socket_path).exists() {
            return Err("SSH management service not running".to_string());
        }
        
        let request = format!("remove|{}", username);
        
        match OpenOptions::new().write(true).open(socket_path) {
            Ok(mut file) => {
                if let Err(e) = writeln!(file, "{}", request) {
                    return Err(format!("Failed to write to service socket: {}", e));
                }
            }
            Err(e) => return Err(format!("Failed to open service socket: {}", e)),
        }
        
        // Wait for response
        for _ in 0..50 {
            if std::path::Path::new(response_path).exists() {
                match std::fs::read_to_string(response_path) {
                    Ok(response) => {
                        std::fs::remove_file(response_path).ok();
                        if response.trim() == "SUCCESS" {
                            info!("Deleted system user '{}' via service", username);
                            return Ok(());
                        } else {
                            return Err(format!("Service error: {}", response.trim()));
                        }
                    }
                    Err(_) => continue,
                }
            }
            std::thread::sleep(std::time::Duration::from_millis(100));
        }
        
        Err("Service timeout".to_string())
    }
    
    /// Direct sudo method for deletion
    async fn delete_user_direct(&self, username: &str) -> Result<(), String> {
    /// Direct sudo method for deletion
    async fn delete_user_direct(&self, username: &str) -> Result<(), String> {
        // Kill any processes owned by the user
        let _ = Command::new("sudo")
            .args(&["pkill", "-u", username])
            .output();

        // Remove user and home directory
        let delete_output = Command::new("sudo")
            .args(&["userdel", "-r", username])
            .output()
            .map_err(|e| format!("Failed to execute userdel: {}", e))?;

        if !delete_output.status.success() {
            return Err(format!("Failed to delete user: {}", String::from_utf8_lossy(&delete_output.stderr)));
        }

        info!("Deleted system user '{}'", username);
        Ok(())
    }
}

impl Default for SshManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_ssh_manager_creation() {
        let manager = SshManager::new();
        assert!(manager.get_current_user().is_none());
        assert!(manager.get_active_jobs().is_empty());
    }

    #[test]
    fn test_password_generation() {
        let manager = SshManager::new();
        let password = manager.generate_secure_password();
        assert_eq!(password.len(), 16);
    }
}
