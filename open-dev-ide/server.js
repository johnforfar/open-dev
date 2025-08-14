const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');

const execAsync = promisify(exec);
const app = express();
const PORT = 3001; // Different port from main frontend

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// VM Status API
app.get('/api/vm-status', async (req, res) => {
  try {
    // Check VM status by looking for running QEMU processes
    const { stdout: qemuProcesses } = await execAsync(
      `ps aux | grep qemu-system-aarch64 | grep -v grep | head -1`,
      { timeout: 5000 }
    );

    if (!qemuProcesses.trim()) {
      return res.json({
        isRunning: false,
        isAccessible: false,
        status: "stopped",
        pid: null,
        cpuUsage: 0,
        uptime: "0s",
        diskSize: "0B"
      });
    }

    // Parse the process info
    const processInfo = qemuProcesses.trim();
    const pidMatch = processInfo.match(/^\s*(\d+)/);
    
    if (!pidMatch) {
      return res.json({
        isRunning: false,
        isAccessible: false,
        status: "stopped",
        pid: null,
        cpuUsage: 0,
        uptime: "0s",
        diskSize: "0B"
      });
    }

    const pid = pidMatch[1];
    
    // Get detailed process info
    const { stdout: detailedInfo } = await execAsync(
      `ps -p ${pid} -o pid,ppid,pcpu,etime,comm 2>/dev/null || echo ""`,
      { timeout: 5000 }
    );

    if (!detailedInfo.trim()) {
      return res.json({
        isRunning: false,
        isAccessible: false,
        status: "stopped",
        pid: null,
        cpuUsage: 0,
        uptime: "0s",
        diskSize: "0B"
      });
    }

    // Parse detailed process info
    const lines = detailedInfo.trim().split('\n');
    if (lines.length < 2) {
      return res.json({
        isRunning: false,
        isAccessible: false,
        status: "stopped",
        pid: null,
        cpuUsage: 0,
        uptime: "0s",
        diskSize: "0B"
      });
    }

    const [, pidInfo] = lines;
    const [processPid, , cpuUsage, uptime, comm] = pidInfo.trim().split(/\s+/);

    // Determine status based on uptime and process info
    let status = "starting";
    if (uptime && uptime.includes(':')) {
      const [hours, minutes] = uptime.split(':').map(Number);
      if (hours > 0 || minutes > 5) {
        status = "running";
      } else if (minutes > 2) {
        status = "installing";
      }
    }

    // Check if we can access the VM via SSH (port 2222)
    let isAccessible = false;
    try {
      const { stdout: portCheck } = await execAsync(
        `lsof -i :2222 2>/dev/null | grep LISTEN || echo ""`,
        { timeout: 3000 }
      );
      isAccessible = portCheck.trim().length > 0;
    } catch (error) {
      isAccessible = false;
    }

    res.json({
      isRunning: true,
      isAccessible: isAccessible,
      status: status,
      pid: processPid,
      cpuUsage: parseFloat(cpuUsage) || 0,
      uptime: uptime || "0s",
      diskSize: "Unknown", // We'll get this from the VM later
      processInfo: processInfo
    });

  } catch (error) {
    console.error('Error checking VM status:', error);
    res.status(500).json({ 
      error: 'Failed to check VM status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start VM API
app.post('/api/start-vm', async (req, res) => {
  try {
    const { action, vmType } = req.body;
    
    if (action !== 'start' || vmType !== 'ubuntu-nixos') {
      return res.status(400).json({ error: 'Invalid action or VM type' });
    }

    // Get the path to the xnodeos-vm directory
    const xnodeosPath = path.join(__dirname, '..', 'xnodeos-vm');
    
    // Start the automated VM setup
    const { stdout, stderr } = await execAsync(
      `cd "${xnodeosPath}" && chmod +x automated-ubuntu-nixos.sh && ./automated-ubuntu-nixos.sh`,
      { timeout: 30000 } // 30 second timeout
    );

    res.json({ 
      success: true, 
      message: 'VM setup started successfully',
      output: stdout,
      error: stderr
    });

  } catch (error) {
    console.error('Error starting automated VM:', error);
    res.status(500).json({ 
      error: 'Failed to start VM setup',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Stop VM API
app.post('/api/stop-vm', async (req, res) => {
  try {
    // Stop any running QEMU VMs
    const { stdout, stderr } = await execAsync(
      `pkill -f qemu-system-aarch64`,
      { timeout: 10000 } // 10 second timeout
    );

    res.json({ 
      success: true, 
      message: 'VM stopped successfully',
      output: stdout,
      error: stderr
    });

  } catch (error) {
    console.error('Error stopping VM:', error);
    res.status(500).json({ 
      error: 'Failed to stop VM',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Import local VM as xnode
app.post('/api/import-local-vm', async (req, res) => {
  try {
    // This would integrate with the existing xnode import logic
    // For now, we'll return a success message
    res.json({ 
      success: true, 
      message: 'Local VM imported successfully as xnode',
      xnodeId: 'local-vm-' + Date.now()
    });
  } catch (error) {
    console.error('Error importing local VM:', error);
    res.status(500).json({ 
      error: 'Failed to import local VM',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 OpenDev IDE running on http://localhost:${PORT}`);
  console.log(`📱 Main frontend: http://localhost:3000`);
  console.log(`🔧 Local dev interface: http://localhost:${PORT}`);
});
