const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');

const execAsync = promisify(exec);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Serve the runtime integration script
app.get('/runtime-integration.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'runtime-integration.js'));
});

// Serve the debug script
app.get('/debug-bookmarklet.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'debug-bookmarklet.js'));
});

// API Routes

// Check QEMU availability
app.get('/api/qemu-check', async (req, res) => {
  try {
    // Check if QEMU is installed and accessible
    let qemuAvailable = false;
    let qemuVersion = '';
    let error = '';
    
    try {
      // Try to get QEMU version
      const { stdout } = await execAsync('qemu-system-aarch64 --version');
      qemuAvailable = true;
      qemuVersion = stdout.split('\n')[0]; // First line usually contains version
    } catch (qemuError) {
      qemuAvailable = false;
      error = qemuError.message;
    }
    
    res.json({
      available: qemuAvailable,
      version: qemuVersion,
      error: error,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Error checking QEMU availability:', error);
    res.json({
      available: false,
      version: '',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

app.get('/api/vm-status', async (req, res) => {
  try {
    // Check for running QEMU VMs
    let stdout = '';
    try {
      const result = await execAsync('ps aux | grep qemu-system-aarch64 | grep -v grep');
      stdout = result.stdout;
    } catch (grepError) {
      // This is expected when no QEMU processes are running
      stdout = '';
    }
    
    const vms = [];
    
    if (stdout.trim()) {
      // Parse QEMU process output
      const lines = stdout.trim().split('\n');
      
      for (const line of lines) {
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
          const pid = parseInt(parts[1]);
          
          // Check if this is a valid QEMU process
          if (!isNaN(pid)) {
            try {
              // Check if the VM is responding on expected ports
              const vm = {
                id: `local-vm-${pid}`,
                name: 'Local QEMU VM',
                status: 'running',
                pid,
                cpu: 0, // Will be updated by monitoring
                memory: 0, // Will be updated by monitoring
                disk: 0, // Will be updated by monitoring
                uptime: 'Unknown',
                host: 'localhost',
                port: 2222, // Default SSH port
              };
              
              vms.push(vm);
            } catch (error) {
              console.log(`Error processing VM ${pid}:`, error);
            }
          }
        }
      }
    }
    
    res.json({
      success: true,
      vms,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Error checking VM status:', error);
    
    res.json({
      success: false,
      vms: [],
      error: 'Failed to check VM status',
      timestamp: new Date().toISOString(),
    });
  }
});

// Start local VM
app.post('/api/start-vm', async (req, res) => {
  try {
    // Path to the automated setup script
    const scriptPath = path.join(__dirname, '..', 'xnodeos-vm', 'automated-ubuntu-nixos.sh');
    
    console.log('🚀 Starting local VM setup...');
    console.log('📁 Script path:', scriptPath);
    
    // Check if script exists
    try {
      await execAsync(`ls -la "${scriptPath}"`);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'Automated setup script not found. Please ensure xnodeos-vm/automated-ubuntu-nixos.sh exists.',
      });
    }
    
    // Check if Ubuntu ISO already exists and is valid
    const isoPath = path.join(__dirname, '..', 'xnodeos-vm', 'ubuntu-24.04.3-live-server-arm64.iso');
    let isoExists = false;
    let isoSize = 0;
    
    try {
      const { stdout: isoStats } = await execAsync(`ls -la "${isoPath}"`);
      if (isoStats.trim()) {
        const parts = isoStats.trim().split(/\s+/);
        if (parts.length >= 5) {
          isoSize = parseInt(parts[4]);
          isoExists = isoSize > 1000000000; // > 1GB
        }
      }
    } catch (error) {
      console.log('ISO file not found or error checking stats');
    }
    
    if (isoExists) {
      console.log('✅ Ubuntu ISO already exists, starting VM directly...');
      
      // Start the VM setup in the background
      const { stdout, stderr } = await execAsync(`bash "${scriptPath}"`, {
        cwd: path.dirname(scriptPath),
        timeout: 30000, // 30 second timeout for initial startup
      });
      
      console.log('✅ VM setup started successfully');
      console.log('📋 Output:', stdout);
      if (stderr) console.log('⚠️ Warnings:', stderr);
      
      res.json({
        success: true,
        message: 'Local VM started successfully (ISO already present)',
        output: stdout,
        warnings: stderr,
        isoExists: true,
        timestamp: new Date().toISOString(),
      });
    } else {
      console.log('📥 Ubuntu ISO not found, will download first...');
      
      // Start the download and setup process
      const { stdout, stderr } = await execAsync(`bash "${scriptPath}"`, {
        cwd: path.dirname(scriptPath),
        timeout: 30000, // 30 second timeout for initial startup
      });
      
      console.log('✅ VM setup started successfully');
      console.log('📋 Output:', stdout);
      if (stderr) console.log('⚠️ Warnings:', stderr);
      
      res.json({
        success: true,
        message: 'Local VM setup started successfully (downloading Ubuntu ISO)',
        output: stdout,
        warnings: stderr,
        isoExists: false,
        timestamp: new Date().toISOString(),
      });
    }
    
  } catch (error) {
    console.error('❌ Failed to start VM:', error);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start local VM',
      timestamp: new Date().toISOString(),
    });
  }
});

// Get download progress
app.get('/api/download-progress', async (req, res) => {
  try {
    const isoPath = path.join(__dirname, '..', 'xnodeos-vm', 'ubuntu-24.04.3-live-server-arm64.iso');
    let progress = {
      exists: false,
      size: 0,
      expectedSize: 2861000000, // ~2.86GB
      percentage: 0,
      status: 'not_started'
    };
    
    try {
      const { stdout: isoStats } = await execAsync(`ls -la "${isoPath}"`);
      if (isoStats.trim()) {
        const parts = isoStats.trim().split(/\s+/);
        if (parts.length >= 5) {
          progress.size = parseInt(parts[4]);
          progress.exists = true;
          progress.percentage = Math.round((progress.size / progress.expectedSize) * 100);
          
          if (progress.percentage >= 100) {
            progress.status = 'complete';
          } else if (progress.size > 0) {
            progress.status = 'downloading';
          }
        }
      }
    } catch (error) {
      progress.status = 'not_started';
    }
    
    res.json({
      success: true,
      progress,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('❌ Error checking download progress:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

app.post('/api/stop-vm', async (req, res) => {
  try {
    console.log('🛑 Stopping local VMs...');
    
    // Find and stop all running QEMU VMs
    const { stdout } = await execAsync('ps aux | grep qemu-system-aarch64 | grep -v grep');
    
    if (!stdout.trim()) {
      return res.json({
        success: true,
        message: 'No running VMs found',
        timestamp: new Date().toISOString(),
      });
    }
    
    // Parse PIDs and stop each VM
    const lines = stdout.trim().split('\n');
    const stoppedVMs = [];
    
    for (const line of lines) {
      const parts = line.split(/\s+/);
      if (parts.length >= 2) {
        const pid = parseInt(parts[1]);
        
        if (!isNaN(pid)) {
          try {
            console.log(`🛑 Stopping VM with PID: ${pid}`);
            await execAsync(`kill -TERM ${pid}`);
            
            // Wait a bit for graceful shutdown
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Check if still running, force kill if needed
            try {
              await execAsync(`ps -p ${pid}`);
              console.log(`⚠️ VM ${pid} still running, force killing...`);
              await execAsync(`kill -KILL ${pid}`);
            } catch (error) {
              // Process is already stopped
            }
            
            stoppedVMs.push(pid);
            console.log(`✅ VM ${pid} stopped successfully`);
            
          } catch (error) {
            console.error(`❌ Failed to stop VM ${pid}:`, error);
          }
        }
      }
    }
    
    res.json({
      success: true,
      message: `Stopped ${stoppedVMs.length} local VM(s)`,
      stoppedVMs,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('❌ Failed to stop VMs:', error);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to stop local VMs',
      timestamp: new Date().toISOString(),
    });
  }
});

// Get detailed VM information
app.get('/api/vm-details/:pid', async (req, res) => {
  const pid = req.params.pid;
  try {
    console.log(`🔍 Fetching details for VM PID: ${pid}`);
    
    // Get the full command using a different approach to avoid truncation
    let command = 'Unknown';
    try {
      // Try to get the full command using a wider format
      const { stdout: cmdOutput } = await execAsync(`ps -p ${pid} -o command= -ww`);
      if (cmdOutput.trim()) {
        command = cmdOutput.trim();
        if (command.length > 120) {
          command = command.substring(0, 120) + '...';
        }
      }
    } catch (error) {
      console.log(`⚠️ Could not get full command: ${error.message}`);
      // Fallback to basic command name
      try {
        const { stdout: basicCmd } = await execAsync(`ps -p ${pid} -o comm=`);
        if (basicCmd.trim()) {
          command = basicCmd.trim();
        }
      } catch (fallbackError) {
        console.log(`⚠️ Fallback command also failed: ${fallbackError.message}`);
      }
    }
    
    // Get process details with better formatting
    const { stdout: psOutput } = await execAsync(`ps -p ${pid} -o pid,ppid,pcpu,pmem,vsz,rss,etime,start`);
    const lines = psOutput.trim().split('\n');
    if (lines.length < 2) {
      console.log(`❌ Process ${pid} not found in ps output`);
      return res.status(404).json({ success: false, error: 'Process not found' });
    }
    
    const parts = lines[1].trim().split(/\s+/);
    console.log(`🔍 Raw ps output: ${lines[1]}`);
    
    // Parse the ps output more carefully
    // Format: PID PPID %CPU %MEM VSZ RSS ELAPSED START
    let cpu = '0%';
    let memory = '0%';
    let virtualMem = '0MB';
    let physicalMem = '0MB';
    let startTime = 'Unknown';
    
    if (parts.length >= 8) {
      cpu = `${parseFloat(parts[2]) || 0}%`;
      memory = `${parseFloat(parts[3]) || 0}%`;
      const vsz = parseInt(parts[4]) || 0;
      const rss = parseInt(parts[5]) || 0;
      virtualMem = `${Math.round(vsz / 1024)}MB`;
      physicalMem = `${Math.round(rss / 1024)}MB`;
      startTime = parts[7] || 'Unknown';
    }
    
    console.log(`🔍 Parsed data: CPU=${cpu}, Memory=${memory}, Command=${command}`);
    
    // Get working directory
    let workingDir = 'Unknown';
    try {
      const { stdout: pwdOutput } = await execAsync(`lsof -p ${pid} | grep cwd`);
      if (pwdOutput.trim()) {
        const parts = pwdOutput.trim().split(/\s+/);
        workingDir = parts[parts.length - 1];
        console.log(`📁 Working directory: ${workingDir}`);
      } else {
        console.log(`⚠️ No working directory found in lsof output`);
      }
    } catch (error) {
      console.log(`⚠️ Could not get working directory: ${error.message}`);
      // Try alternative method
      try {
        const { stdout: pwdxOutput } = await execAsync(`pwdx ${pid}`);
        if (pwdxOutput.trim()) {
          workingDir = pwdxOutput.trim().split(': ')[1];
          console.log(`📁 Working directory (pwdx): ${workingDir}`);
        }
      } catch (pwdxError) {
        console.log(`⚠️ pwdx also failed: ${pwdxError.message}`);
      }
    }
    
    // Get additional process info
    let processStatus = 'Unknown';
    try {
      const { stdout: statusOutput } = await execAsync(`ps -p ${pid} -o state`);
      if (statusOutput.trim()) {
        const statusLine = statusOutput.trim().split('\n')[1];
        if (statusLine) {
          processStatus = statusLine.trim();
        }
      }
    } catch (error) {
      console.log(`⚠️ Could not get process status: ${error.message}`);
    }
    
    const result = {
      success: true,
      pid,
      command,
      cpu,
      memory,
      virtualMem,
      physicalMem,
      workingDir,
      startTime,
      status: processStatus
    };
    
    console.log(`✅ VM details:`, result);
    res.json(result);
    
  } catch (error) {
    console.error(`❌ Error getting VM details for PID ${pid}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test VM connections
app.post('/api/test-connection', async (req, res) => {
  const { host, port, type } = req.body;
  
  try {
    if (type === 'ssh') {
      // Test SSH connection
      try {
        await execAsync(`timeout 5 ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no -p ${port} ubuntu@${host} echo "SSH connection successful"`);
        res.json({ success: true, message: 'SSH connection established' });
      } catch (sshError) {
        res.json({ success: false, message: 'SSH connection failed - VM may not be fully booted yet' });
      }
    } else if (type === 'https') {
      // Test HTTPS connection
      try {
        await execAsync(`timeout 5 curl -s -k https://${host}:${port}`);
        res.json({ success: true, message: 'HTTPS service responding' });
      } catch (curlError) {
        res.json({ success: false, message: 'HTTPS service not responding - xnode-manager may not be running yet' });
      }
    } else {
      res.status(400).json({ success: false, error: 'Invalid connection type' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 OpenDev IDE Local Development Server running on port ${PORT}`);
  console.log(`🔧 API endpoints:`);
  console.log(`   GET  /api/vm-status - Check VM status`);
  console.log(`   POST /api/start-vm - Start local VM`);
  console.log(`   POST /api/stop-vm - Stop local VMs`);
  console.log(`   GET  /api/vm-details/:pid - Get detailed VM info`);
  console.log(`   POST /api/test-connection - Test VM connections`);
  console.log(`   GET  /runtime-integration.js - Runtime integration script`);
  console.log(`   GET  /health - Health check`);
});

module.exports = app;
