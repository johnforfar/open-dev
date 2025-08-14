import { useMemo } from 'react';

export function useLocalDevMode() {
  const isLocalDev = useMemo(() => {
    if (typeof window === 'undefined') return false;
    
    // Check if we're running on localhost in development
    return process.env.NODE_ENV === 'development' && 
           (window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1');
  }, []);

  // Provide a mock address for local development
  const localAddress = 'eth:localdevmode123456789abcdef';
  
  return {
    isLocalDev,
    localAddress,
    // Skip wallet connection in local mode
    shouldSkipWallet: isLocalDev,
  };
}
