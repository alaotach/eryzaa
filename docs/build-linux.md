# Building for Linux

Since cross-compilation from Windows to Linux requires Docker/WSL setup, here are the easiest options:

## Option 1: Use GitHub Actions (Recommended)
Create a `.github/workflows/build.yml` file to auto-build for multiple platforms.

## Option 2: Use a Linux VM or WSL
1. Install WSL: `wsl --install Ubuntu`
2. In WSL terminal:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.bashrc
cd /mnt/c/Users/nobit/erryzaaaaa/rental
cargo build --release
cd ../client
cargo build --release
```

## Option 3: Send Source Code
Your friend can compile it themselves:
1. Send the `client/` and `rental/` folders
2. Your friend runs:
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.bashrc

# Build applications
cd rental && cargo build --release
cd ../client && cargo build --release
```

## Files to Send
- `client/src/main.rs`
- `client/Cargo.toml`
- `rental/src/main.rs` 
- `rental/Cargo.toml`

Your friend gets:
- ZeroTier auto-installation for Linux
- SSH server setup
- Network joining to 363c67c55ad2489d
- Full remote access capability
