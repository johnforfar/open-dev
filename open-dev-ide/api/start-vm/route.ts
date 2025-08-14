import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    // Path to the automated setup script
    const scriptPath = path.join(process.cwd(), '..', 'xnodeos-vm', 'automated-ubuntu-nixos.sh');
    
    console.log('🚀 Starting local VM setup...');
    console.log('📁 Script path:', scriptPath);
    
    // Check if script exists
    try {
      await execAsync(`ls -la "${scriptPath}"`);
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Automated setup script not found. Please ensure xnodeos-vm/automated-ubuntu-nixos.sh exists.',
      }, { status: 404 });
    }
    
    // Start the VM setup in the background
    const { stdout, stderr } = await execAsync(`bash "${scriptPath}"`, {
      cwd: path.dirname(scriptPath),
      timeout: 30000, // 30 second timeout for initial startup
    });
    
    console.log('✅ VM setup started successfully');
    console.log('📋 Output:', stdout);
    if (stderr) console.log('⚠️ Warnings:', stderr);
    
    return NextResponse.json({
      success: true,
      message: 'Local VM setup started successfully',
      output: stdout,
      warnings: stderr,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error: any) {
    console.error('❌ Failed to start VM:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to start local VM',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
