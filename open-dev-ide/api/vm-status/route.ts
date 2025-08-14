import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET(request: NextRequest) {
  try {
    // Check for running QEMU VMs
    const { stdout } = await execAsync('ps aux | grep qemu-system-aarch64 | grep -v grep');
    
    const vms: any[] = [];
    
    if (stdout.trim()) {
      // Parse QEMU process output
      const lines = stdout.trim().split('\n');
      
      for (const line of lines) {
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
          const pid = parseInt(parts[1]);
          
          // Check if this is a valid QEMU process
          if (!isNaN(pid)) {
            // Try to get more details about the VM
            try {
              // Check if the VM is responding on expected ports
              const vm = {
                id: `local-vm-${pid}`,
                name: 'Local QEMU VM',
                status: 'running' as const,
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
    
    return NextResponse.json({
      success: true,
      vms,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Error checking VM status:', error);
    
    return NextResponse.json({
      success: false,
      vms: [],
      error: 'Failed to check VM status',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
