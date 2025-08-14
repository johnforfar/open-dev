// Simple test script to debug injection
console.log('🧪 Test injection script loaded');

// Try to add a simple element to see if injection works
setTimeout(() => {
  console.log('🧪 Attempting to inject test element...');
  
  const testDiv = document.createElement('div');
  testDiv.id = 'test-injection';
  testDiv.style.cssText = 'position: fixed; top: 10px; right: 10px; background: red; color: white; padding: 10px; z-index: 9999;';
  testDiv.textContent = '🧪 INJECTION WORKED!';
  
  document.body.appendChild(testDiv);
  
  console.log('🧪 Test element added:', testDiv);
}, 2000);
