#!/usr/bin/env python3
"""
Eryza Cross-Platform Launcher
Automatically detects the platform and launches the appropriate application.
"""

import os
import sys
import platform
import subprocess
import tkinter as tk
from tkinter import messagebox, ttk
from pathlib import Path

class EryzaLauncher:
    def __init__(self):
        self.platform = platform.system().lower()
        self.arch = platform.machine().lower()
        self.script_dir = Path(__file__).parent
        
        # Map platform names
        self.platform_map = {
            'linux': 'linux',
            'darwin': 'apple',
            'windows': 'windows'
        }
        
        # Map architecture names
        self.arch_map = {
            'x86_64': 'x86_64',
            'amd64': 'x86_64',
            'arm64': 'aarch64',
            'aarch64': 'aarch64'
        }
        
        self.root = None
        
    def get_target_triple(self):
        """Get the appropriate target triple for current platform."""
        platform_name = self.platform_map.get(self.platform, 'unknown')
        arch_name = self.arch_map.get(self.arch, 'x86_64')
        
        if platform_name == 'linux':
            return f"{arch_name}-unknown-linux-gnu"
        elif platform_name == 'apple':
            return f"{arch_name}-apple-darwin"
        elif platform_name == 'windows':
            return f"{arch_name}-pc-windows-msvc"
        else:
            return "x86_64-unknown-linux-gnu"  # fallback
    
    def find_executable(self, app_name):
        """Find the executable for the given app name."""
        target = self.get_target_triple()
        exe_ext = '.exe' if self.platform == 'windows' else ''
        
        # Try different locations
        search_paths = [
            # Current directory
            self.script_dir / f"{app_name}{exe_ext}",
            # Target-specific directory
            self.script_dir / target / f"{app_name}{exe_ext}",
            # Dist directory
            self.script_dir / "dist" / target / f"{app_name}{exe_ext}",
            # Target build directory
            self.script_dir / "target" / "release" / f"{app_name}{exe_ext}",
            # Individual app build directories
            self.script_dir / "gui-client" / "target" / "release" / f"{app_name}{exe_ext}",
            self.script_dir / "gui-rental" / "target" / "release" / f"{app_name}{exe_ext}",
        ]
        
        for path in search_paths:
            if path.exists() and path.is_file():
                return path
                
        return None
    
    def launch_app(self, app_name):
        """Launch the specified application."""
        executable = self.find_executable(app_name)
        
        if not executable:
            messagebox.showerror(
                "Application Not Found", 
                f"Could not find {app_name} executable.\n"
                f"Platform: {self.platform}\n"
                f"Target: {self.get_target_triple()}\n\n"
                "Please build the applications first using the build script."
            )
            return False
            
        try:
            if self.platform == 'windows':
                subprocess.Popen([str(executable)], creationflags=subprocess.CREATE_NEW_CONSOLE)
            else:
                subprocess.Popen([str(executable)])
            return True
        except Exception as e:
            messagebox.showerror("Launch Error", f"Failed to launch {app_name}:\n{str(e)}")
            return False
    
    def check_requirements(self):
        """Check if required software is installed."""
        requirements = []
        
        # Check Docker
        try:
            subprocess.run(['docker', '--version'], capture_output=True, check=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            requirements.append(("Docker", "https://www.docker.com/products/docker-desktop"))
        
        # Check ZeroTier (optional)
        try:
            subprocess.run(['zerotier-cli', 'info'], capture_output=True, check=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            if self.platform == 'linux':
                requirements.append(("ZeroTier", "Auto-installable via rental app"))
            else:
                requirements.append(("ZeroTier", "https://www.zerotier.com/download/"))
        
        return requirements
    
    def show_requirements_dialog(self, requirements):
        """Show dialog for missing requirements."""
        req_window = tk.Toplevel(self.root)
        req_window.title("Missing Requirements")
        req_window.geometry("500x300")
        req_window.resizable(False, False)
        
        # Center the window
        req_window.transient(self.root)
        req_window.grab_set()
        
        tk.Label(req_window, text="Missing Requirements", font=("Arial", 14, "bold")).pack(pady=10)
        
        tk.Label(req_window, text="The following software is required:", font=("Arial", 10)).pack(pady=5)
        
        frame = tk.Frame(req_window)
        frame.pack(pady=10, padx=20, fill=tk.BOTH, expand=True)
        
        for software, url in requirements:
            row_frame = tk.Frame(frame)
            row_frame.pack(fill=tk.X, pady=2)
            
            tk.Label(row_frame, text=f"• {software}:", font=("Arial", 10, "bold")).pack(side=tk.LEFT)
            tk.Label(row_frame, text=url, font=("Arial", 9), fg="blue").pack(side=tk.LEFT, padx=(10, 0))
        
        if self.platform != 'linux':
            tk.Label(req_window, 
                    text="Note: On Linux, missing requirements will be auto-installed.",
                    font=("Arial", 9), fg="gray").pack(pady=10)
        
        tk.Button(req_window, text="Continue Anyway", 
                 command=req_window.destroy).pack(pady=10)
    
    def create_gui(self):
        """Create the main GUI."""
        self.root = tk.Tk()
        self.root.title("Eryza Launcher")
        self.root.geometry("600x400")
        self.root.resizable(False, False)
        
        # Style configuration
        style = ttk.Style()
        style.theme_use('clam')
        
        # Main frame
        main_frame = tk.Frame(self.root, bg='#f0f0f0')
        main_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)
        
        # Title
        title_label = tk.Label(main_frame, text="🏠 Eryza - Computing Resource Sharing", 
                              font=("Arial", 16, "bold"), bg='#f0f0f0')
        title_label.pack(pady=(0, 20))
        
        # Platform info
        info_frame = tk.Frame(main_frame, bg='#f0f0f0')
        info_frame.pack(pady=(0, 20))
        
        tk.Label(info_frame, text=f"Platform: {self.platform.title()}", 
                font=("Arial", 10), bg='#f0f0f0').pack()
        tk.Label(info_frame, text=f"Architecture: {self.arch}", 
                font=("Arial", 10), bg='#f0f0f0').pack()
        tk.Label(info_frame, text=f"Target: {self.get_target_triple()}", 
                font=("Arial", 10), bg='#f0f0f0').pack()
        
        # Applications frame
        apps_frame = tk.Frame(main_frame, bg='#f0f0f0')
        apps_frame.pack(pady=20, fill=tk.BOTH, expand=True)
        
        # Rental server section
        rental_frame = tk.LabelFrame(apps_frame, text="Share Your Computer (Rental Server)", 
                                   font=("Arial", 12, "bold"), bg='#f0f0f0', pady=10)
        rental_frame.pack(fill=tk.X, pady=(0, 10))
        
        tk.Label(rental_frame, text="Turn your computer into a rental server that others can access",
                font=("Arial", 10), bg='#f0f0f0').pack(pady=5)
        
        rental_btn = tk.Button(rental_frame, text="🖥️ Launch Rental Server", 
                              font=("Arial", 11, "bold"), bg='#4CAF50', fg='white',
                              command=lambda: self.launch_app('eryza-rental'))
        rental_btn.pack(pady=5)
        
        # Client section
        client_frame = tk.LabelFrame(apps_frame, text="Access Rental Servers (Client)", 
                                   font=("Arial", 12, "bold"), bg='#f0f0f0', pady=10)
        client_frame.pack(fill=tk.X, pady=(0, 10))
        
        tk.Label(client_frame, text="Connect to and use other people's rental servers",
                font=("Arial", 10), bg='#f0f0f0').pack(pady=5)
        
        client_btn = tk.Button(client_frame, text="💻 Launch Client", 
                              font=("Arial", 11, "bold"), bg='#2196F3', fg='white',
                              command=lambda: self.launch_app('eryza-client'))
        client_btn.pack(pady=5)
        
        # CLI section
        cli_frame = tk.LabelFrame(apps_frame, text="Command Line Interface", 
                                font=("Arial", 12, "bold"), bg='#f0f0f0', pady=10)
        cli_frame.pack(fill=tk.X, pady=(0, 10))
        
        tk.Label(cli_frame, text="Advanced command-line client for developers",
                font=("Arial", 10), bg='#f0f0f0').pack(pady=5)
        
        cli_btn = tk.Button(cli_frame, text="⌨️ Launch CLI Client", 
                           font=("Arial", 11), bg='#FF9800', fg='white',
                           command=lambda: self.launch_app('eryza-cli'))
        cli_btn.pack(pady=5)
        
        # Bottom frame
        bottom_frame = tk.Frame(main_frame, bg='#f0f0f0')
        bottom_frame.pack(side=tk.BOTTOM, fill=tk.X, pady=(20, 0))
        
        # Requirements check button
        req_btn = tk.Button(bottom_frame, text="Check Requirements", 
                           command=self.check_and_show_requirements)
        req_btn.pack(side=tk.LEFT)
        
        # Build button
        build_btn = tk.Button(bottom_frame, text="Build Applications", 
                             command=self.open_build_instructions)
        build_btn.pack(side=tk.LEFT, padx=(10, 0))
        
        # Exit button
        exit_btn = tk.Button(bottom_frame, text="Exit", command=self.root.quit)
        exit_btn.pack(side=tk.RIGHT)
        
        # Center the window
        self.root.update_idletasks()
        x = (self.root.winfo_screenwidth() // 2) - (self.root.winfo_width() // 2)
        y = (self.root.winfo_screenheight() // 2) - (self.root.winfo_height() // 2)
        self.root.geometry(f"+{x}+{y}")
    
    def check_and_show_requirements(self):
        """Check requirements and show dialog if any are missing."""
        requirements = self.check_requirements()
        
        if requirements:
            self.show_requirements_dialog(requirements)
        else:
            messagebox.showinfo("Requirements Check", "All requirements are satisfied! ✅")
    
    def open_build_instructions(self):
        """Show build instructions dialog."""
        build_window = tk.Toplevel(self.root)
        build_window.title("Build Instructions")
        build_window.geometry("600x400")
        build_window.resizable(True, True)
        
        build_window.transient(self.root)
        build_window.grab_set()
        
        # Text widget with scrollbar
        text_frame = tk.Frame(build_window)
        text_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        text_widget = tk.Text(text_frame, wrap=tk.WORD, font=("Consolas", 10))
        scrollbar = tk.Scrollbar(text_frame, orient=tk.VERTICAL, command=text_widget.yview)
        text_widget.configure(yscrollcommand=scrollbar.set)
        
        build_instructions = f"""Build Instructions for {self.platform.title()}

To build the Eryza applications:

1. Install Rust (if not already installed):
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

2. Run the build script:
   
   Linux/macOS:
   ./build.sh --all --package
   
   Windows (PowerShell):
   .\\build.ps1 -All -Package
   
   Windows (Command Prompt):
   powershell -ExecutionPolicy Bypass -File build.ps1 -All -Package

3. Built applications will be in the dist/ directory

Build Options:
  --all / -All           Build for all supported platforms
  --package / -Package   Create distribution packages
  --target TARGET        Build for specific target only

Current Platform Target: {self.get_target_triple()}

For more detailed instructions, see the README.md file.
"""
        
        text_widget.insert(tk.END, build_instructions)
        text_widget.config(state=tk.DISABLED)
        
        text_widget.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        tk.Button(build_window, text="Close", command=build_window.destroy).pack(pady=10)
    
    def run(self):
        """Run the launcher."""
        if len(sys.argv) > 1:
            # Command line mode
            app_name = sys.argv[1]
            if app_name in ['rental', 'server']:
                app_name = 'eryza-rental'
            elif app_name in ['client']:
                app_name = 'eryza-client'
            elif app_name in ['cli']:
                app_name = 'eryza-cli'
            else:
                print(f"Unknown application: {app_name}")
                print("Available applications: rental, client, cli")
                sys.exit(1)
            
            success = self.launch_app(app_name)
            sys.exit(0 if success else 1)
        else:
            # GUI mode
            self.create_gui()
            self.root.mainloop()

if __name__ == "__main__":
    launcher = EryzaLauncher()
    launcher.run()
