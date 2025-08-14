import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { action, vmType } = await request.json();
    
    if (action !== 'start' || vmType !== 'ubuntu-nixos') {
      return NextResponse.json({ error: 'Invalid action or VM type' }, { status: 400 });
    }

    // Get the path to the xnodeos-vm directory (relative to the frontend)
    const xnodeosPath = process.cwd().replace('/open-dev-ide/api', '/xnodeos-vm');
    
    // Start the automated VM setup
    const { stdout, stderr } = await execAsync(
      `cd "${xnodeosPath}" && chmod +x automated-ubuntu-nixos.sh && ./automated-ubuntu-nixos.sh`,
      { timeout: 30000 } // 30 second timeout
    );

    return NextResponse.json({ 
      success: true, 
      message: 'VM setup started successfully',
      output: stdout,
      error: stderr
    });

  } catch (error) {
    console.error('Error starting automated VM:', error);
    return NextResponse.json({ 
      error: 'Failed to start VM setup',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
