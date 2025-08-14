# 🚀 OpenDev - Local Development Environment for XNODEOS + XNODE-STUDIO

This repository provides a complete local development environment for running XNODEOS + XNODE-STUDIO locally with automated VM setup and seamless integration.

## 🎯 What This Provides

- **Local VM Management**: Automated QEMU VM setup with Ubuntu → NixOS conversion
- **Local App Deployment**: Deploy apps to your local VM just like remote xnodes
- **Local Monitoring**: Real-time CPU, memory, and disk monitoring of your local VM
- **Seamless Integration**: Works alongside normal xnode deployments
- **Clean Architecture**: Keeps submodules untouched while adding local dev features

## 🏗️ Architecture

```
open-dev/
├── openmesh-network/xnode-manager-frontend/  # Clean submodule (original UI)
├── open-dev-ide/                            # Local development customizations
│   ├── runtime-integration.js               # Script that gets injected
│   ├── local-dev-server.js                  # Local development API server
│   ├── components/                           # React components (for reference)
│   └── integration-loader.html              # HTML that loads the integration
├── xnodeos-vm/                              # VM automation scripts
└── Makefile                                 # Commands to manage integration
```

## 🚀 Quick Start

### 1. Initial Setup
```bash
# Clone and setup everything
./clone-essential-repos.sh clone
./clone-essential-repos.sh docker

# Install dependencies
make setup
```

### 2. Start Development Environment
```bash
# Start both servers (frontend + local dev server)
make dev
```

### 3. Enable Local Development Features
1. Go to `http://localhost:3001/bookmarklet.html`
2. Drag the bookmarklet to your browser's bookmark bar
3. Go to `http://localhost:3000` (main frontend)
4. Click the bookmarklet to inject local dev features
5. Watch the magic happen! 🎉

## 🔧 How It Works

### Runtime Integration (No File Modifications)
- **Clean Submodule**: `xnode-manager-frontend` remains completely untouched
- **Runtime Injection**: Local dev features are injected via JavaScript bookmarklet
- **Same UI**: User sees the exact same interface with local features seamlessly integrated
- **Easy Sync**: `git submodule update --remote` works perfectly without conflicts

### Local Development Server
- Runs on port 3001 alongside the main frontend
- Provides API endpoints for VM management
- Handles QEMU VM operations (start, stop, status)
- Complete separation of concerns

### DOM Integration
- Uses JavaScript to find existing UI elements
- Adds local VM management buttons next to existing buttons
- Shows local VMs in the existing xnodes list
- Skips wallet authentication when in local mode

## 📱 User Experience

- **Same Look & Feel**: Identical to production interface
- **Local Mode Detection**: Automatically detected when running locally
- **No Wallet Required**: Skip signin when running locally
- **Integrated VM Management**: Local VMs appear alongside remote xnodes
- **Same Deployment Flow**: Use identical interface for local and remote deployments

## 🛠️ Available Commands

```bash
# Development
make dev                    # Start integrated development environment
make quick-dev             # Quick development start (assumes setup is complete)

# VM Management
make start-vm              # Start automated Ubuntu → NixOS VM setup
make stop-vm               # Stop running VM
make status                # Check VM status
make clean                 # Clean up VM files
make logs                  # Show VM logs

# Maintenance
make update-frontend       # Update xnode-manager-frontend submodule
make integrate-local-dev   # Apply local development customizations
make dev-cycle            # Full development cycle (clean + start-vm + dev)
```

## 🔄 Git Submodule Strategy

- `xnode-manager-frontend` remains as a clean submodule in `openmesh-network/`
- Local customizations live in `open-dev-ide/` 
- Easy to update the frontend submodule without losing local customizations
- Local customizations can be committed to this repo independently

## 📁 Key Directories

- **`openmesh-network/xnode-manager-frontend/`**: Clean submodule with original UI
- **`open-dev-ide/`**: Local development customizations and runtime integration
- **`xnodeos-vm/`**: VM automation scripts and configuration
- **`Makefile`**: Centralized commands for all operations

## ✅ Benefits

- **Clean Architecture**: Submodules remain untouched
- **Easy Upstream Sync**: No conflicts when updating frontend
- **Same User Experience**: Identical interface to production
- **Local Features**: Seamlessly integrated local VM management
- **Professional Approach**: Runtime injection without file modifications

## 🚨 Troubleshooting

### Port Conflicts
If ports 3000 or 3001 are in use:
- The system will automatically use available ports
- Check the console output for the actual ports being used

### VM Issues
- Use `make status` to check VM state
- Use `make logs` to see recent activity
- Use `make clean` to reset if needed

### Integration Issues
- Ensure both servers are running (`make dev`)
- Check browser console for any JavaScript errors
- Verify bookmarklet is properly installed

---

**🎉 Happy Local Development!** The OpenDev system gives you the best of both worlds: a clean, maintainable codebase with powerful local development features.
