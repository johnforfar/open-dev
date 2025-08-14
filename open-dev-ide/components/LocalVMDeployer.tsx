'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useLocalVMs } from '@/hooks/local-dev/useLocalVMs';
import { useLocalDevMode } from '@/hooks/local-dev/useLocalDevMode';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, Square, Monitor } from 'lucide-react';

export function LocalVMDeployer() {
  const { isLocalDev } = useLocalDevMode();
  const { vms, loading, startVM, stopVM, hasRunningVMs } = useLocalVMs();
  const [open, setOpen] = useState(false);

  if (!isLocalDev) {
    return null; // Only show in local development mode
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Monitor className="h-4 w-4" />
          Local VM
          {hasRunningVMs && (
            <Badge variant="secondary" className="ml-2">
              {vms.filter(vm => vm.status === 'running').length} Running
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Local QEMU VM Management</DialogTitle>
          <DialogDescription>
            Manage your local development VM for testing and development.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* VM Status */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">VM Status</h3>
            {loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking VM status...
              </div>
            ) : vms.length === 0 ? (
              <Alert>
                <AlertDescription>
                  No local VMs detected. Click "Start Local VM" to create one.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2">
                {vms.map((vm) => (
                  <div key={vm.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        vm.status === 'running' ? 'bg-green-500' : 'bg-gray-400'
                      }`} />
                      <div>
                        <p className="font-medium">{vm.name}</p>
                        <p className="text-sm text-muted-foreground">
                          PID: {vm.pid} • Port: {vm.port}
                        </p>
                      </div>
                    </div>
                    <Badge variant={vm.status === 'running' ? 'default' : 'secondary'}>
                      {vm.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button 
              onClick={startVM} 
              disabled={loading || hasRunningVMs}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              Start Local VM
            </Button>
            
            {hasRunningVMs && (
              <Button 
                onClick={stopVM} 
                variant="destructive"
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Square className="h-4 w-4" />
                Stop All VMs
              </Button>
            )}
          </div>

          {/* Info */}
          <Alert>
            <AlertDescription>
              <strong>Local Development Mode:</strong> This will create a QEMU VM with Ubuntu → NixOS 
              conversion. The setup takes 10-15 minutes but is fully automated. Once ready, 
              you can deploy apps to your local VM just like remote xnodes.
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  );
}
