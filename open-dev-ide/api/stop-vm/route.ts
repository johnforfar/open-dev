import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    console.log('🛑 Stopping local VMs...');
    
    // Find and stop all running QEMU VMs
    const { stdout } = await execAsync('ps aux | grep qemu-system-aarch64 | grep -v grep');
    
    if (!stdout.trim()) {
      return NextResponse.json({
        success: true,
        message: 'No running VMs found',
        timestamp: new Date().toISOString(),
      });
    }
    
    // Parse PIDs and stop each VM
    const lines = stdout.trim().split('\n');
    const stoppedVMs: number[] = [];
    
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
    
    return NextResponse.json({
      success: true,
      message: `Stopped ${stoppedVMs.length} local VM(s)`,
      stoppedVMs,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error: any) {
    console.error('❌ Failed to stop VMs:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to stop local VMs',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
