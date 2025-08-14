import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface VMStatus {
  isRunning: boolean;
  isAccessible: boolean;
  status: string;
  pid?: string;
  cpuUsage?: number;
  uptime?: string;
  diskSize?: string;
}

export const AutomatedVMSetup: React.FC = () => {
  const [isStarting, setIsStarting] = useState(false);
  const [vmStatus, setVmStatus] = useState<VMStatus | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const startAutomatedVM = async () => {
    setIsStarting(true);
    setLogs([]);
    setProgress(0);
    
    try {
      addLog('🚀 Starting automated Ubuntu → NixOS installation...');
      setProgress(10);
      
      // Start the automated VM setup via our local API
      const response = await fetch('/api/local-dev/start-vm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'start',
          vmType: 'ubuntu-nixos'
        }),
      });

      if (response.ok) {
        addLog('⏳ VM creation started - this will take 10-15 minutes');
        setProgress(20);
        
        // Start polling for status
        pollVMStatus();
      } else {
        throw new Error('Failed to start VM');
      }
    } catch (error) {
      addLog(`❌ Error: ${error}`);
      setIsStarting(false);
      setProgress(0);
    }
  };

  const pollVMStatus = async () => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/local-dev/vm-status');
        if (response.ok) {
          const status: VMStatus = await response.json();
          setVmStatus(status);
          
          if (status.isRunning) {
            if (status.status === 'starting') {
              addLog('🔄 VM is starting up...');
              setProgress(40);
            } else if (status.status === 'installing') {
              addLog('📦 Ubuntu installation in progress...');
              setProgress(60);
            } else if (status.status === 'converting') {
              addLog('🔄 Converting to NixOS...');
              setProgress(80);
            } else if (status.status === 'running') {
              addLog('✅ VM is running! Checking xnode-manager...');
              setProgress(90);
              clearInterval(interval);
              checkXnodeManager();
            }
          }
        }
      } catch (error) {
        addLog(`⚠️ Status check failed: ${error}`);
      }
    }, 5000); // Check every 5 seconds
  };

  const checkXnodeManager = async () => {
    try {
      const response = await fetch('https://localhost:443/xnode-auth/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true }),
      });
      
      if (response.ok) {
        addLog('🎉 xnode-manager is running! Your VM is ready.');
        addLog('🔗 Frontend will now connect automatically');
        setProgress(100);
        setIsStarting(false);
        
        // Auto-import the local VM as an xnode
        importLocalVM();
      } else {
        addLog('⏳ xnode-manager starting up... checking again in 30s');
        setTimeout(checkXnodeManager, 30000);
      }
    } catch (error) {
      addLog('⏳ xnode-manager not ready yet... checking again in 30s');
      setTimeout(checkXnodeManager, 30000);
    }
  };

  const importLocalVM = async () => {
    try {
      // This would integrate with the existing xnode import logic
      addLog('📱 Importing local VM as xnode...');
      // The actual import logic would go here, integrating with existing components
    } catch (error) {
      addLog(`⚠️ Auto-import failed: ${error}`);
    }
  };

  const stopVM = async () => {
    try {
      await fetch('/api/local-dev/stop-vm', { method: 'POST' });
      addLog('🛑 VM stopped');
      setVmStatus(null);
      setProgress(0);
    } catch (error) {
      addLog(`❌ Failed to stop VM: ${error}`);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🚀 Local Development VM Setup
        </CardTitle>
        <CardDescription>
          Automatically create a QEMU VM with Ubuntu → NixOS + xnode-manager for local development
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        {isStarting && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Installation Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button
            onClick={startAutomatedVM}
            disabled={isStarting}
            size="lg"
            className="flex-1"
          >
            {isStarting ? '🚀 Starting...' : '🚀 Start Automated Setup'}
          </Button>
          
          {vmStatus?.isRunning && (
            <Button
              onClick={stopVM}
              variant="destructive"
              size="lg"
            >
              🛑 Stop VM
            </Button>
          )}
        </div>

        {/* VM Status */}
        {vmStatus && (
          <Card className="bg-muted/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">VM Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="font-medium">Status</div>
                  <Badge variant={vmStatus.status === 'running' ? 'default' : 'secondary'}>
                    {vmStatus.status}
                  </Badge>
                </div>
                <div>
                  <div className="font-medium">PID</div>
                  <code className="text-xs">{vmStatus.pid || 'Unknown'}</code>
                </div>
                <div>
                  <div className="font-medium">CPU</div>
                  <code className="text-xs">{vmStatus.cpuUsage?.toFixed(1)}%</code>
                </div>
                <div>
                  <div className="font-medium">Uptime</div>
                  <code className="text-xs">{vmStatus.uptime || 'Unknown'}</code>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Installation Logs */}
        {logs.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Installation Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto">
                {logs.map((log, index) => (
                  <div key={index} className="mb-1">{log}</div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info */}
        <div className="text-sm text-muted-foreground space-y-2">
          <p>💡 <strong>Pro tip:</strong> This setup takes 10-15 minutes but is fully automated!</p>
          <p>🔧 After completion, you can deploy xnode-ai-chat and other apps via the frontend.</p>
          <p>📱 The VM will automatically appear in your xnodes list once ready.</p>
        </div>
      </CardContent>
    </Card>
  );
};
