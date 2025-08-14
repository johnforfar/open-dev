'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface LocalDevContextType {
  isLocalDev: boolean;
  localVMs: LocalVM[];
  refreshLocalVMs: () => void;
  startLocalVM: () => Promise<void>;
  stopLocalVM: () => Promise<void>;
}

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

const LocalDevContext = createContext<LocalDevContextType | undefined>(undefined);

export function useLocalDev() {
  const context = useContext(LocalDevContext);
  if (!context) {
    throw new Error('useLocalDev must be used within a LocalDevProvider');
  }
  return context;
}

export function LocalDevProvider({ children }: { children: React.ReactNode }) {
  const [isLocalDev, setIsLocalDev] = useState(false);
  const [localVMs, setLocalVMs] = useState<LocalVM[]>([]);

  // Detect if we're running in local development
  useEffect(() => {
    const isLocal = process.env.NODE_ENV === 'development' && 
                   (typeof window !== 'undefined' && window.location.hostname === 'localhost');
    setIsLocalDev(isLocal);
    
    if (isLocal) {
      refreshLocalVMs();
      // Poll for VM status every 5 seconds
      const interval = setInterval(refreshLocalVMs, 5000);
      return () => clearInterval(interval);
    }
  }, []);

  const refreshLocalVMs = async () => {
    if (!isLocalDev) return;

    try {
      // Check for running QEMU VMs
      const response = await fetch('/api/local-dev/vm-status');
      if (response.ok) {
        const data = await response.json();
        setLocalVMs(data.vms || []);
      }
    } catch (error) {
      console.log('Local dev mode: No VMs detected yet');
    }
  };

  const startLocalVM = async () => {
    if (!isLocalDev) return;

    try {
      const response = await fetch('/api/local-dev/start-vm', { method: 'POST' });
      if (response.ok) {
        await refreshLocalVMs();
      }
    } catch (error) {
      console.error('Failed to start local VM:', error);
    }
  };

  const stopLocalVM = async () => {
    if (!isLocalDev) return;

    try {
      const response = await fetch('/api/local-dev/stop-vm', { method: 'POST' });
      if (response.ok) {
        await refreshLocalVMs();
      }
    } catch (error) {
      console.error('Failed to stop local VM:', error);
    }
  };

  const value: LocalDevContextType = {
    isLocalDev,
    localVMs,
    refreshLocalVMs,
    startLocalVM,
    stopLocalVM,
  };

  return (
    <LocalDevContext.Provider value={value}>
      {children}
    </LocalDevContext.Provider>
  );
}
