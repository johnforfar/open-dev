import { useState, useEffect, useCallback } from 'react';

interface LocalVM {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'starting' | 'stopping';
  pid?: number;
  cpu: number;
  memory: number;
  disk: number;
  uptime: string;
  host: string;
  port: number;
}

export function useLocalVMs() {
  const [vms, setVms] = useState<LocalVM[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshVMs = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/local-dev/vm-status');
      if (response.ok) {
        const data = await response.json();
        setVms(data.vms || []);
      } else {
        setError('Failed to fetch VM status');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const startVM = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/local-dev/start-vm', { method: 'POST' });
      if (response.ok) {
        // Wait a bit for VM to start, then refresh
        setTimeout(refreshVMs, 5000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to start VM');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [refreshVMs]);

  const stopVM = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/local-dev/stop-vm', { method: 'POST' });
      if (response.ok) {
        // Refresh immediately after stopping
        setTimeout(refreshVMs, 1000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to stop VM');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [refreshVMs]);

  // Auto-refresh every 10 seconds when VMs are running
  useEffect(() => {
    if (vms.some(vm => vm.status === 'running')) {
      const interval = setInterval(refreshVMs, 10000);
      return () => clearInterval(interval);
    }
  }, [vms, refreshVMs]);

  // Initial load
  useEffect(() => {
    refreshVMs();
  }, [refreshVMs]);

  return {
    vms,
    loading,
    error,
    refreshVMs,
    startVM,
    stopVM,
    hasRunningVMs: vms.some(vm => vm.status === 'running'),
  };
}
