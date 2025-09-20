# Use Ubuntu 24.04 as base image with CUDA 13.0.1 support for GPU access
FROM nvidia/cuda:13.0.1-cudnn-devel-ubuntu24.04

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV NVIDIA_VISIBLE_DEVICES=all
ENV NVIDIA_DRIVER_CAPABILITIES=compute,utility,graphics

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    gnupg2 \
    software-properties-common \
    openssh-server \
    sudo \
    htop \
    nano \
    vim \
    git \
    python3 \
    python3-pip \
    nodejs \
    npm \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install ZeroTier
RUN curl -s https://install.zerotier.com | bash

# Install Rust for the rental application
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Configure SSH
RUN mkdir /var/run/sshd
RUN echo 'root:rental_access_2024' | chpasswd
RUN sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config
RUN sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config
RUN sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config

# Create a non-root user for safer operations
RUN useradd -m -s /bin/bash rental && \
    echo 'rental:rental_user_2024' | chpasswd && \
    usermod -aG sudo rental

# Create workspace directory
RUN mkdir -p /workspace
RUN chown rental:rental /workspace

# Copy rental application source
COPY rental/ /workspace/rental/
RUN chown -R rental:rental /workspace/

# Build rental application as rental user
USER rental
WORKDIR /workspace/rental
RUN /root/.cargo/bin/cargo build --release

# Switch back to root for service management
USER root

# Create startup script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose SSH port
EXPOSE 22

# Set entrypoint
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
