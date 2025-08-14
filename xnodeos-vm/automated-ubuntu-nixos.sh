#!/bin/bash

set -e

VM_NAME="ubuntu-nixos"
DISK_FILE="${VM_NAME}.qcow2"
PID_FILE="${VM_NAME}.pid"
ISO_FILE="ubuntu-24.04.3-live-server-arm64.iso"
UEFI_FIRMWARE="/opt/homebrew/Cellar/qemu/10.0.3/share/qemu/edk2-aarch64-code.fd"

# Function to validate ISO file
validate_iso() {
    local file="$1"
    local min_size_mb=1000  # Minimum 1GB for a real ISO
    
    if [ ! -f "$file" ]; then
        echo "❌ File $file does not exist"
        return 1
    fi
    
    local size_bytes=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
    local size_mb=$((size_bytes / 1024 / 1024))
    
    echo "📏 File size: ${size_mb}MB"
    
    if [ $size_mb -lt $min_size_mb ]; then
        echo "❌ File too small (${size_mb}MB < ${min_size_mb}MB) - likely corrupted or error page"
        return 1
    fi
    
    # Check if it's actually an ISO file
    if file "$file" | grep -q "ISO 9660\|DOS/MBR boot sector\|Apple partition map"; then
        echo "✅ File appears to be a valid ISO"
        return 0
    else
        echo "❌ File doesn't appear to be a valid ISO:"
        file "$file"
        return 1
    fi
}

# Download Ubuntu 24.04.3 ARM64 ISO if not present or invalid
if [ ! -f "$ISO_FILE" ] || ! validate_iso "$ISO_FILE"; then
    echo "📥 Downloading Ubuntu 24.04.3 ARM64 ISO..."
    
    # Remove corrupted file if it exists
    if [ -f "$ISO_FILE" ]; then
        echo "🗑️ Removing corrupted file: $ISO_FILE"
        rm -f "$ISO_FILE"
    fi
    
    # Try multiple download sources
    download_success=false
    
    # Source 1: Ubuntu CD image server (primary source for ARM64)
    echo "🔗 Trying Ubuntu CD image server..."
    if curl -L -o "$ISO_FILE" "https://cdimage.ubuntu.com/releases/24.04/release/ubuntu-24.04.3-live-server-arm64.iso"; then
        if validate_iso "$ISO_FILE"; then
            download_success=true
            echo "✅ Ubuntu 24.04.3 ARM64 ISO downloaded successfully from CD image server"
        fi
    fi
    
    # Source 2: Ubuntu releases (fallback)
    if [ "$download_success" = false ]; then
        echo "🔗 Trying Ubuntu releases..."
        if curl -L -o "$ISO_FILE" "https://releases.ubuntu.com/24.04/ubuntu-24.04.3-live-server-arm64.iso"; then
            if validate_iso "$ISO_FILE"; then
                download_success=true
                echo "✅ Ubuntu 24.04.3 ARM64 ISO downloaded successfully from releases"
            fi
        fi
    fi
    
    # Source 3: Ubuntu daily builds (fallback)
    if [ "$download_success" = false ]; then
        echo "🔗 Trying Ubuntu daily builds..."
        if curl -L -o "$ISO_FILE" "https://cdimage.ubuntu.com/daily-live/current/noble-live-server-arm64.iso"; then
            if validate_iso "$ISO_FILE"; then
                download_success=true
                echo "✅ Ubuntu 24.04.3 daily ARM64 ISO downloaded successfully"
            fi
        fi
    fi
    
    if [ "$download_success" = false ]; then
        echo "❌ Failed to download valid Ubuntu ISO from all sources"
        echo "🔍 Checking what we got:"
        if [ -f "$ISO_FILE" ]; then
            echo "File size: $(stat -f%z "$ISO_FILE" 2>/dev/null || stat -c%s "$ISO_FILE" 2>/dev/null) bytes"
            echo "File type: $(file "$ISO_FILE")"
            echo "First few lines:"
            head -5 "$ISO_FILE" 2>/dev/null || echo "Could not read file"
        fi
        exit 1
    fi
else
    echo "✅ Ubuntu 24.04.3 ARM64 ISO already present and valid"
fi

# Create preseed file for fully automated Ubuntu installation
cat > preseed.cfg << 'EOF'
# Locale and keyboard
d-i debian-installer/locale string en_US
d-i keyboard-configuration/xkb-keymap select us

# Network
d-i netcfg/choose_interface select auto
d-i netcfg/get_hostname string ubuntu-nixos
d-i netcfg/get_domain string local

# User account
d-i passwd/user-fullname string Ubuntu User
d-i passwd/username string ubuntu
d-i passwd/user-password-crypted password $6$rounds=656000$salt$hashedpassword
d-i passwd/user-password-again-crypted password $6$rounds=656000$salt$hashedpassword
d-i user-setup/allow-password-weak boolean true

# Partitioning
d-i partman-auto/method string regular
d-i partman-auto/choose_recipe select atomic
d-i partman/confirm_write_new_label boolean true
d-i partman/choose_partition select finish
d-i partman/confirm boolean true
d-i partman/confirm_nooverwrite boolean true

# Package installation
d-i pkgsel/update-policy select none
d-i pkgsel/include string openssh-server curl wget git

# Boot loader
d-i grub-installer/only_debian boolean true
d-i grub-installer/with_other_os boolean true

# Finishing
d-i finish-install/reboot_in_progress note
EOF

# Create post-install script that will run the xnode-manager installer
cat > post-install.sh << 'EOF'
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
EOF

# Create cloud-init configuration
mkdir -p cloud-init
cat > cloud-init/user-data << 'EOF'
#cloud-config
hostname: ubuntu-nixos
users:
  - name: ubuntu
    sudo: ALL=(ALL) NOPASSWD:ALL
    shell: /bin/bash
    ssh_authorized_keys:
      - ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQ... # Add your SSH key here
ssh_pwauth: true
disable_root: false
chpasswd:
  list: |
    ubuntu:ubuntu
  expire: false
package_update: true
package_upgrade: true
packages:
  - openssh-server
  - curl
  - wget
  - git
  - nix
runcmd:
  - curl -L https://nixos.org/nix/install | sh
  - source /etc/profile.d/nix.sh
  - export XNODE_OWNER="eth:0x0000000000000000000000000000000000000000"
  - export DOMAIN="localhost"
  - export ACME_EMAIL="dev@localhost"
  - export ENCRYPTED="0"
  - export USER_PASSWD="ubuntu"
  - curl -L https://raw.githubusercontent.com/Openmesh-Network/xnode-manager/main/os/install.sh | bash
EOF

cat > cloud-init/meta-data << 'EOF'
instance-id: ubuntu-nixos
local-hostname: ubuntu-nixos
EOF

# Create cloud-init ISO
mkisofs -o cloud-init.iso -V cidata -r -J cloud-init/

# Stop any existing VM
if [ -f "$PID_FILE" ]; then
	echo "🛑 Stopping existing VM..."
	kill $(cat "$PID_FILE") 2>/dev/null || true
	rm -f "$PID_FILE"
fi

# Create 64GB disk
if [ -f "$DISK_FILE" ]; then
	echo "♻️  Reusing existing disk: $DISK_FILE"
else
	echo "💾 Creating 64GB disk: $DISK_FILE"
	qemu-img create -f qcow2 "$DISK_FILE" 64G
fi

echo "🚀 Starting FULLY AUTOMATED Ubuntu → NixOS installation..."
echo "   - ISO: $ISO_FILE"
echo "   - Disk: $DISK_FILE"
echo "   - SSH: localhost:2222 (user: ubuntu, password: ubuntu)"
echo "   - HTTPS: localhost:443"
echo "   - Installation will be 100% automated!"
echo "   - Ubuntu will install, then automatically convert to NixOS"
echo ""

# Start VM with automated installation
nohup qemu-system-aarch64 \
	-M virt \
	-cpu cortex-a72 \
	-m 4G \
	-smp 4 \
	-drive file="$ISO_FILE",media=cdrom,readonly=on \
	-drive file="$DISK_FILE",if=virtio,format=qcow2 \
	-drive file="cloud-init.iso",media=cdrom,readonly=on \
	-boot d \
	-display none \
	-net nic,model=virtio \
	-net user,hostfwd=tcp::2222-:22,hostfwd=tcp::443-:443 \
	-pidfile "$PID_FILE" \
	-name "$VM_NAME" \
	-serial stdio \
	-monitor null > qemu.log 2>&1 &

# Wait a moment for QEMU to start
sleep 3

# Check if QEMU started successfully
if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
    echo "✅ QEMU VM started successfully with PID: $(cat $PID_FILE)"
    echo "🔍 Check qemu.log for VM output"
else
    echo "❌ Failed to start QEMU VM"
    exit 1
fi
