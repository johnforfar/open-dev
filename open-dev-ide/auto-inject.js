// 🚀 OpenDev IDE Auto-Injection Script
// This tiny script automatically loads local development features when running on localhost
// WITHOUT modifying any files in the git submodule

(function() {
  'use strict';
  
  // Only run on localhost in development
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return;
  }
  
  if (process.env.NODE_ENV !== 'development') {
    return;
  }
  
  console.log('🚀 OpenDev IDE: Auto-injecting local development features...');
  
  // Load the full runtime integration script
  const script = document.createElement('script');
  script.src = 'http://localhost:3001/runtime-integration.js';
  script.onload = () => console.log('✅ OpenDev IDE: Runtime integration loaded successfully');
  script.onerror = () => console.log('❌ OpenDev IDE: Failed to load runtime integration');
  
  document.head.appendChild(script);
})();
