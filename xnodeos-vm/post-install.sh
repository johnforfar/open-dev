#!/bin/bash
# This script runs after Ubuntu installation completes

# Wait for system to be ready
sleep 30

# Install Nix package manager
curl -L https://nixos.org/nix/install | sh
source /etc/profile.d/nix.sh

# Set environment variables (user will customize these)
export XNODE_OWNER="eth:0x0000000000000000000000000000000000000000"
export DOMAIN="localhost"
export ACME_EMAIL="dev@localhost"
export ENCRYPTED="0"
export USER_PASSWD="ubuntu"

# Run the xnode-manager installer
curl -L https://raw.githubusercontent.com/Openmesh-Network/xnode-manager/main/os/install.sh | bash

# Reboot into NixOS
reboot
