.PHONY: help dev start-vm stop-vm status clean logs setup update-frontend check-qemu

# Default target
help:
	@echo "🚀 OpenDev - Automated VM Setup for OpenXAI Developers"
	@echo ""
	@echo "Commands:"
	@echo "  make setup           - Initial setup (dependencies + submodules)"
	@echo "  make dev             - Start integrated development environment"
	@echo "  make check-qemu      - Check QEMU installation status"
	@echo "  make start-vm        - Start automated Ubuntu → NixOS VM"
	@echo "  make stop-vm         - Stop running VM"
	@echo "  make status          - Check VM status"
	@echo "  make clean           - Clean up VM files"
	@echo "  make logs            - Show VM logs"
	@echo "  make update-frontend - Update xnode-manager-frontend submodule"
	@echo "  make quick-check     - Quick dependency check"
	@echo "  make quick-dev       - Quick dev start (assumes setup complete)"
	@echo ""

# Initial setup
setup: install-deps download-iso init-submodules
	@echo "🎉 Setup complete! Run 'make dev' to start developing"

# Install dependencies
install-deps:
	@echo "📦 Installing dependencies..."
	@echo "🔍 Checking if QEMU is already installed..."
	@if ! command -v qemu-system-aarch64 >/dev/null 2>&1; then \
		echo "📥 Installing QEMU via Homebrew..."; \
		brew install qemu; \
	else \
		echo "✅ QEMU is already installed"; \
	fi
	@if ! command -v mkisofs >/dev/null 2>&1; then \
		echo "📥 Installing cdrtools..."; \
		brew install cdrtools; \
	else \
		echo "✅ cdrtools is already installed"; \
	fi
	@echo "✅ Dependencies installed"

# Download Ubuntu ISO
download-iso:
	@echo "📥 Downloading Ubuntu 24.04.3 Server ARM64 ISO..."
	@if [ ! -f "xnodeos-vm/../ubuntu-24.04.3-live-server-arm64.iso" ]; then \
		curl -L -o "xnodeos-vm/../ubuntu-24.04.3-live-server-arm64.iso" \
		"https://ubuntu.com/download/server/arm"; \
	else \
		echo "✅ Ubuntu ISO already exists"; \
	fi

# Initialize git submodules
init-submodules:
	@echo "🔗 Initializing git submodules..."
	@git submodule update --init --recursive
	@echo "✅ Submodules initialized"

# Start integrated development environment
dev: check-qemu
	@echo "🚀 Starting OpenDev integrated development environment..."
	@echo "📱 Main Frontend: http://localhost:3000"
	@echo "🔧 Local Dev Server: http://localhost:3001"
	@echo "📋 Bookmarklet Setup: http://localhost:3001/bookmarklet.html"
	@echo ""
	@echo "🚀 To enable local development features:"
	@echo "   1. Go to http://localhost:3001/bookmarklet.html"
	@echo "   2. Drag the bookmarklet to your browser's bookmark bar"
	@echo "   3. Go to http://localhost:3000 (main frontend)"
	@echo "   4. Click the bookmarklet to inject local dev features"
	@echo "   5. Watch the magic happen! 🎉"
	@echo ""
	@echo "🔄 Starting both servers..."
	@cd open-dev-ide && nohup node local-dev-server.js > server.log 2>&1 &
	@sleep 3
	@cd openmesh-network/xnode-manager-frontend/nextjs-app && npm run dev

# Start automated VM setup
start-vm:
	@echo "🚀 Starting automated Ubuntu → NixOS VM setup..."
	@echo "⏳ This will take 10-15 minutes to complete"
	@echo "📱 Monitor progress in the frontend at /local-dev"
	@cd xnodeos-vm && ./automated-ubuntu-nixos.sh

# Stop running VM
stop-vm:
	@echo "🛑 Stopping VM..."
	@cd xnodeos-vm && make stop-vm

# Check VM status
status:
	@echo "📊 VM Status:"
	@cd xnodeos-vm && make status

# Check QEMU installation
check-qemu:
	@echo "🔍 Checking QEMU installation..."
	@if command -v qemu-system-aarch64 >/dev/null 2>&1; then \
		echo "✅ QEMU is installed and accessible"; \
		qemu-system-aarch64 --version | head -1; \
	else \
		echo "❌ QEMU is not installed or not accessible"; \
		echo "💡 Run 'make setup' to install dependencies"; \
		exit 1; \
	fi

# Clean up VM files
clean:
	@echo "🧹 Cleaning up VM files..."
	@cd xnodeos-vm && make clean

# Show VM logs
logs:
	@echo "📋 Recent VM activity:"
	@cd xnodeos-vm && make logs

# Update xnode-manager-frontend submodule
update-frontend:
	@echo "🔄 Updating xnode-manager-frontend to latest upstream..."
	@git submodule update --remote xnode-manager-frontend
	@echo "✅ Frontend updated! Review changes and test with 'make dev'"
	@echo "💡 Your local customizations are preserved in /local-dev"

# Integrate local development features
integrate-local-dev:
	@echo "🔧 Integrating local development features..."
	@cd open-dev-ide && ./integration.sh
	@echo "✅ Local dev features integrated! Run 'make dev' to start"

# Quick development start (assumes setup is complete)
quick-dev:
	@echo "⚡ Quick development start..."
	@make dev

# Quick setup check (just verify dependencies)
quick-check:
	@echo "🔍 Quick dependency check..."
	@make check-qemu
	@echo "✅ All dependencies are ready!"

# Full development cycle
dev-cycle: clean start-vm dev
	@echo "🔄 Full development cycle started!"
	@echo "📱 VM is starting, frontend is running"
	@echo "🔧 Go to /local-dev to monitor progress"
