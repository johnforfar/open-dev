// 🚀 OpenDev IDE Runtime Integration
// This script injects local development features into the existing UI
// WITHOUT modifying any files in the git submodule

(function() {
  'use strict';
  
  console.log('🚀 OpenDev IDE Runtime Integration loaded');
  console.log('📍 Current URL:', window.location.href);
  console.log('📍 Document ready state:', document.readyState);
  console.log('📍 Body children count:', document.body.children.length);
  
  // Configuration
  const CONFIG = {
    LOCAL_DEV_API: 'http://localhost:3001',
    POLL_INTERVAL: 5000,
    SELECTORS: {
      // Main page elements - multiple fallback strategies
      MAIN_PAGE: '.flex.flex-col.gap-5, div[class*="flex"][class*="flex-col"][class*="gap-5"], div[class*="gap-5"]',
      BUTTON_CONTAINER: '.flex.gap-3.items-center, div[class*="flex"][class*="gap-3"][class*="items-center"]',
      XNODES_SECTION: '.\\@container, div[class*="container"], [class*="@container"], div[class*="gap-2"]',
      
      // Button selectors - multiple fallback strategies
      DEPLOY_BUTTON: 'button[class*="bg-blue"], button[class*="bg-primary"], button[class*="primary"]',
      IMPORT_BUTTON: 'button[class*="border"], button[class*="secondary"]',
      RESET_BUTTON: 'button[class*="bg-red"], button[class*="destructive"]',
    }
  };
  
  // Local development state
  let localDevState = {
    isLocalDev: false,
    vms: [],
    isInitialized: false,
    lastVMCount: 0, // Track VM count to prevent unnecessary UI updates
    stableVMs: new Set(), // Track VMs that should remain visible
    qemuAvailable: null, // null = unknown, true = available, false = not available
    qemuInstalling: false
  };
  
  // Utility functions
  function isLocalDevelopment() {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1';
  }
  
  async function checkQEMUAvailability() {
    try {
      // Check if QEMU is available by trying to start a VM
      const response = await fetch(`${CONFIG.LOCAL_DEV_API}/api/qemu-check`);
      if (response.ok) {
        const data = await response.json();
        localDevState.qemuAvailable = data.available;
        console.log('🔍 QEMU availability check:', data);
        return data.available;
      }
    } catch (error) {
      console.log('🔍 QEMU check failed, assuming not available:', error);
      localDevState.qemuAvailable = false;
    }
    return false;
  }
  
  function showQEMUInstallationPrompt() {
    const statusElement = document.getElementById('local-vm-status');
    if (!statusElement) return;
    
    statusElement.innerHTML = `
      <div class="p-4 border border-orange-200 rounded-lg bg-orange-50">
        <div class="flex items-center gap-3 mb-4">
          <div class="text-orange-600 text-2xl">⚠️</div>
          <h3 class="text-lg font-semibold text-orange-900">QEMU Not Installed</h3>
        </div>
        
        <div class="space-y-3">
          <p class="text-orange-800">
            QEMU virtualization software is required to run local VMs. 
            Please install it first using the terminal:
          </p>
          
          <div class="bg-orange-100 p-3 rounded-lg">
            <div class="font-mono text-sm text-orange-800">
              <div>cd /path/to/open-dev</div>
              <div>make setup</div>
            </div>
          </div>
          
          <p class="text-orange-800 text-sm">
            Or run: <code class="bg-orange-200 px-2 py-1 rounded">brew install qemu</code>
          </p>
        </div>
      </div>
    `;
  }
  
  function isOnMainPage() {
    // Check if we're on the main page by looking for key elements
    const hasMainPage = findMainPageElement();
    const hasXnodesSection = findXnodesSection();
    const buttonInfo = findButtonsByText();
    const hasDeployButton = buttonInfo.deploy || buttonInfo.import || buttonInfo.reset;
    
    // More lenient check: if we have the main structure OR we're on the main page URL, proceed
    const isMainPage = (hasMainPage && hasXnodesSection) || 
                      (window.location.pathname === '/' && hasXnodesSection);
    
    console.log('📍 Page check:', {
      hasMainPage: !!hasMainPage,
      hasXnodesSection: !!hasXnodesSection,
      hasDeployButton: !!hasDeployButton,
      buttonInfo: buttonInfo,
      isMainPage
    });
    
    return isMainPage;
  }
  
  function isPageReady() {
    // Check if we're on the main page and have the necessary elements
    const mainPage = findMainPageElement();
    const xnodesSection = findXnodesSection();
    
    if (!mainPage) {
      console.log('❌ Main page not ready - missing main page element');
      return false;
    }
    
    if (!xnodesSection) {
      console.log('❌ Main page not ready - missing xnodes section');
      return false;
    }
    
    console.log('✅ Page appears to be ready');
    return true;
  }
  
  function findXnodesSection() {
    // Try multiple strategies to find the xnodes section
    let section = document.querySelector(CONFIG.SELECTORS.XNODES_SECTION);
    
    if (!section) {
      // Try to find by looking for the My Xnodes section
      const myXnodesSection = document.querySelector('[id="My_Xnodes"]')?.closest('.flex.flex-col');
      if (myXnodesSection) {
        section = myXnodesSection;
        console.log('Found xnodes section by My Xnodes ID:', section);
      }
    }
    
    if (!section) {
      // Try to find by content - look for elements containing "No Xnodes found" or similar
      const elements = document.querySelectorAll('div');
      for (const el of elements) {
        if (el.textContent && (
          el.textContent.includes('No Xnodes found') ||
          el.textContent.includes('Your Xnodes are saved') ||
          el.textContent.includes('import your Xnodes')
        )) {
          // Make sure we get a reasonable container, not the entire page
          if (el.tagName === 'DIV' && !el.classList.contains('min-h-screen')) {
            section = el;
            console.log('Found xnodes section by content:', section);
            break;
          }
        }
      }
    }
    
    // Final fallback: look for the main container that has the My Xnodes title
    if (!section) {
      const myXnodesTitle = document.querySelector('[id="My_Xnodes"]');
      if (myXnodesTitle) {
        // Go up to find the main container
        section = myXnodesTitle.closest('.flex.flex-col') || myXnodesTitle.parentElement;
        console.log('Found xnodes section by fallback:', section);
      }
    }
    
    // If we still don't have a section, look for the main content area
    if (!section) {
      // Look for the main content div that contains the error message
      const mainContent = document.querySelector('.m-2');
      if (mainContent) {
        section = mainContent;
        console.log('Found main content area for injection:', section);
      }
    }
    
    // Validate that we didn't get the entire HTML document
    if (section && section.tagName === 'HTML') {
      console.log('❌ Got HTML element, trying to find better target');
      section = null;
      
      // Try to find the actual content area
      const contentArea = document.querySelector('.m-2') || 
                         document.querySelector('[id="My_Xnodes"]')?.closest('.flex.flex-col') ||
                         document.querySelector('.flex.flex-col.gap-5');
      
      if (contentArea) {
        section = contentArea;
        console.log('Found better target after HTML validation:', section);
      }
    }
    
    return section;
  }
  
  function findMainPageElement() {
    // Try multiple strategies to find the main page element
    let mainPage = document.querySelector(CONFIG.SELECTORS.MAIN_PAGE);
    
    if (!mainPage) {
      // Strategy 1: Look for elements with gap-5 class
      mainPage = document.querySelector('[class*="gap-5"]');
      console.log('Strategy 1 - gap-5:', mainPage);
    }
    
    if (!mainPage) {
      // Strategy 2: Look for elements containing "My Xnodes" text
      const elements = document.querySelectorAll('div, span, h1, h2, h3, h4, h5, h6');
      for (const el of elements) {
        if (el.textContent && el.textContent.includes('My Xnodes')) {
          // Make sure we get a reasonable container, not the entire page
          if (el.tagName !== 'HTML' && el.tagName !== 'BODY') {
            mainPage = el.closest('[class*="flex"]') || el.closest('[class*="gap"]') || el;
            console.log('Strategy 2 - My Xnodes:', mainPage);
            break;
          }
        }
      }
    }
    
    if (!mainPage) {
      // Strategy 3: Look for any div with multiple children that might be the main container
      const divs = document.querySelectorAll('div');
      for (const div of divs) {
        if (div.children.length >= 3 && div.querySelector('button')) {
          mainPage = div;
          console.log('Strategy 3 - div with buttons:', mainPage);
          break;
        }
      }
    }
    
    // Strategy 4: If we still don't have a main page, use the xnodes section as fallback
    if (!mainPage) {
      const xnodesSection = findXnodesSection();
      if (xnodesSection) {
        // Go up to find a reasonable container
        mainPage = xnodesSection.closest('.flex.flex-col') || 
                   xnodesSection.closest('.m-2') || 
                   xnodesSection;
        console.log('Strategy 4 - fallback to xnodes section:', mainPage);
      }
    }
    
    return mainPage;
  }
  
  function findButtonsByText() {
    // Find buttons by their text content since CSS selectors might not work
    const buttons = document.querySelectorAll('button');
    const buttonInfo = {
      deploy: null,
      import: null,
      reset: null
    };
    
    buttons.forEach(button => {
      const text = button.textContent?.toLowerCase() || '';
      if (text.includes('deploy')) {
        buttonInfo.deploy = button;
        console.log('Found Deploy button by text:', button);
      } else if (text.includes('import')) {
        buttonInfo.import = button;
        console.log('Found Import button by text:', button);
      } else if (text.includes('reset')) {
        buttonInfo.reset = button;
        console.log('Found Reset button by text:', button);
      }
    });
    
    return buttonInfo;
  }
  
  function logPageState() {
    console.log('🔍 Current page state:');
    console.log('- URL:', window.location.href);
    console.log('- Main page element:', document.querySelector(CONFIG.SELECTORS.MAIN_PAGE));
    console.log('- Xnodes section:', findXnodesSection());
    console.log('- Document ready state:', document.readyState);
    console.log('- Body children count:', document.body.children.length);
    
    // Log some key elements for debugging
    const flexElements = document.querySelectorAll('.flex.flex-col.gap-5');
    console.log('- Flex elements with gap-5:', flexElements.length);
    flexElements.forEach((el, i) => {
      console.log(`  ${i}:`, el.className, el.textContent?.substring(0, 100));
    });
    
    // Also log any elements with @container class
    const containerElements = document.querySelectorAll('[class*="@container"]');
    console.log('- @container elements:', containerElements.length);
    containerElements.forEach((el, i) => {
      console.log(`  ${i}:`, el.className, el.textContent?.substring(0, 100));
    });
  }
  
  function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      console.log(`🔍 Waiting for element: ${selector}`);
      
      const element = document.querySelector(selector);
      if (element) {
        console.log(`✅ Element found immediately: ${selector}`);
        resolve(element);
        return;
      }
      
      console.log(`⏳ Element not found, setting up observer for: ${selector}`);
      
      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          console.log(`✅ Element found via observer: ${selector}`);
          observer.disconnect();
          resolve(element);
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      setTimeout(() => {
        observer.disconnect();
        console.error(`❌ Element not found within ${timeout}ms: ${selector}`);
        console.log('Current DOM structure:', document.body.innerHTML.substring(0, 500));
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }, timeout);
    });
  }
  
  function createLocalVMButton() {
    const button = document.createElement('button');
    button.className = 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2';
    button.innerHTML = `
      <svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
      </svg>
      Local VM
    `;
    
    button.addEventListener('click', () => {
      showLocalVMDialog();
    });
    
    return button;
  }
  
  function showLocalVMDialog() {
    console.log('🔧 showLocalVMDialog called');
    
    // Check if we already have the local VM section
    if (document.getElementById('local-vm-section')) {
      console.log('ℹ️ Local VM section already exists');
      return; // Already exists
    }
    
    // Find the My Xnodes section to inject after
    console.log('🔍 Looking for My Xnodes section...');
    
    // Debug: Check what IDs actually exist in the DOM
    console.log('🔍 All elements with IDs:');
    document.querySelectorAll('[id]').forEach(el => {
      console.log(`  ID: "${el.id}" - Tag: ${el.tagName} - Text: "${el.textContent?.substring(0, 50)}"`);
    });
    
    // Try multiple strategies to find the title
    let myXnodesTitle = document.querySelector('[id="My_Xnodes"]');
    if (!myXnodesTitle) {
      myXnodesTitle = document.querySelector('[id="My Xnodes"]'); // Try with space
    }
    if (!myXnodesTitle) {
      // Look for any element containing "My Xnodes" text
      const elements = document.querySelectorAll('*');
      for (const el of elements) {
        if (el.textContent && el.textContent.trim() === 'My Xnodes') {
          myXnodesTitle = el;
          console.log('🔍 Found My Xnodes by text content:', el);
          break;
        }
      }
    }
    
    console.log('🔍 My Xnodes title element:', myXnodesTitle);
    
    // Since the ID isn't working, let's target the structure directly
    console.log('🔍 Trying direct structure targeting...');
    
    // We already know the main page element exists from earlier detection
    // Let's use that instead of trying to find it again
    const mainPageElement = findMainPageElement();
    console.log('🔍 Main page element from findMainPageElement:', mainPageElement);
    
    let mainContainer = null;
    if (mainPageElement) {
      mainContainer = mainPageElement;
      console.log('🔍 Using main page element as container:', mainContainer);
    } else {
      // Fallback: look for any flex.flex-col.gap-5 that contains "My Xnodes" text
      const containers = document.querySelectorAll('.flex.flex-col.gap-5');
      for (const container of containers) {
        if (container.textContent && container.textContent.includes('My Xnodes')) {
          mainContainer = container;
          console.log('🔍 Found main container by text content:', mainContainer);
          break;
        }
      }
    }
    
    if (!mainContainer) {
      console.log('❌ Could not find main container');
      console.log('🔍 Available flex.flex-col.gap-5 elements:');
      document.querySelectorAll('.flex.flex-col.gap-5').forEach((el, i) => {
        console.log(`  ${i}:`, el.tagName, el.className, el.textContent?.substring(0, 100));
      });
      return;
    }
    
    // Create the local VM management section
    const localVMSection = document.createElement('div');
    localVMSection.id = 'local-vm-section';
    localVMSection.className = 'space-y-4';
    
    // Create the section header
    const header = document.createElement('div');
    header.className = 'flex items-center justify-between';
    header.innerHTML = `
      <h2 class="text-lg font-semibold">Local Development VM</h2>
    `;
    
    // Create the status container
    const statusContainer = document.createElement('div');
    statusContainer.id = 'local-vm-status';
    
    // Create the button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'flex gap-3';
    
    const startBtn = document.createElement('button');
    startBtn.id = 'start-vm-btn';
    startBtn.className = 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2';
    startBtn.textContent = 'Start Local VM';
    startBtn.addEventListener('click', startLocalVM);
    
    const stopBtn = document.createElement('button');
    stopBtn.id = 'stop-vm-btn';
    stopBtn.className = 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-red-600 text-white hover:bg-red-700 h-10 px-4 py-2';
    stopBtn.textContent = 'Stop Local VM';
    stopBtn.addEventListener('click', stopLocalVMs);
    stopBtn.style.display = 'none';
    
    // Check QEMU availability and show appropriate UI
    checkQEMUAvailability().then(qemuAvailable => {
      if (qemuAvailable) {
        buttonContainer.appendChild(startBtn);
        buttonContainer.appendChild(stopBtn);
        // Start polling for VM status
        updateLocalVMStatus();
        setInterval(updateLocalVMStatus, CONFIG.POLL_INTERVAL);
      } else {
        showQEMUInstallationPrompt();
        // Disable start button when QEMU is not available
        startBtn.disabled = true;
        startBtn.textContent = 'QEMU Required';
        startBtn.className = startBtn.className.replace('bg-blue-600', 'bg-gray-400');
        buttonContainer.appendChild(startBtn);
      }
    });
    
    localVMSection.appendChild(header);
    localVMSection.appendChild(statusContainer);
    localVMSection.appendChild(buttonContainer);
    
    // Insert after the main container (which contains the entire My Xnodes section)
    mainContainer.parentNode.insertBefore(localVMSection, mainContainer.nextSibling);
    
    // Update the UI
    updateLocalVMUI();
  }
  
  async function updateLocalVMStatus() {
    try {
      const response = await fetch(`${CONFIG.LOCAL_DEV_API}/api/vm-status`);
      if (response.ok) {
        const data = await response.json();
        const newVMs = data.vms || [];
        
        // Only update if VM count changed or if we have new VMs
        if (newVMs.length !== localDevState.lastVMCount || 
            newVMs.some(vm => !localDevState.stableVMs.has(vm.pid))) {
          
          localDevState.vms = newVMs;
          localDevState.lastVMCount = newVMs.length;
          
          // Add running VMs to stable set
          newVMs.forEach(vm => {
            if (vm.status === 'running') {
              localDevState.stableVMs.add(vm.pid);
            }
          });
          
          updateLocalVMUI();
        }
      }
    } catch (error) {
      console.error('Failed to fetch VM status:', error);
    }
  }
  
  async function startLocalVM() {
    // Check if we already have running VMs
    const runningVMs = localDevState.vms.filter(vm => vm.status === 'running');
    
    if (runningVMs.length > 0) {
      // Ask for confirmation before starting another VM
      const confirmStart = confirm(
        `You already have ${runningVMs.length} local VM(s) running:\n` +
        `${runningVMs.map(vm => `• ${vm.name} (PID: ${vm.pid})`).join('\n')}\n\n` +
        `Are you sure you want to start another local VM?\n\n` +
        `Note: Multiple VMs will use more system resources.`
      );
      
      if (!confirmStart) {
        return;
      }
    }
    
    const startBtn = document.getElementById('start-vm-btn');
    startBtn.disabled = true;
    startBtn.textContent = 'Starting...';
    
    // Show download progress UI
    showDownloadProgress();
    
    try {
      const response = await fetch(`${CONFIG.LOCAL_DEV_API}/api/start-vm`, { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          // Check if this is a download operation
          if (data.output && data.output.includes('Downloading Ubuntu')) {
            // Show download progress
            updateDownloadProgress(data.output);
            
            // Poll for download progress
            const progressInterval = setInterval(async () => {
              try {
                const progressResponse = await fetch(`${CONFIG.LOCAL_DEV_API}/api/vm-status`);
                if (progressResponse.ok) {
                  const progressData = await progressResponse.json();
                  
                  // Check if download is complete
                  if (progressData.vms && progressData.vms.length > 0) {
                    clearInterval(progressInterval);
                    hideDownloadProgress();
                    updateLocalVMStatus();
                  }
                }
              } catch (error) {
                console.error('Failed to check download progress:', error);
              }
            }, 2000);
            
            // Also poll for VM status
            setTimeout(() => {
              updateLocalVMStatus();
              const interval = setInterval(() => {
                updateLocalVMStatus();
                if (localDevState.vms.some(vm => vm.status === 'running')) {
                  clearInterval(interval);
                }
              }, CONFIG.POLL_INTERVAL);
            }, 5000);
          } else {
            // Regular VM start
            hideDownloadProgress();
            setTimeout(() => {
              updateLocalVMStatus();
              const interval = setInterval(() => {
                updateLocalVMStatus();
                if (localDevState.vms.some(vm => vm.status === 'running')) {
                  clearInterval(interval);
                }
              }, CONFIG.POLL_INTERVAL);
            }, 5000);
          }
        } else {
          hideDownloadProgress();
          console.error('Failed to start VM:', data.error);
        }
      }
    } catch (error) {
      hideDownloadProgress();
      console.error('Failed to start local VM:', error);
    }
  }
  
  function showDownloadProgress() {
    // Remove existing progress UI if any
    hideDownloadProgress();
    
    const statusElement = document.getElementById('local-vm-status');
    if (!statusElement) return;
    
    statusElement.innerHTML = `
      <div class="p-4 border border-blue-200 rounded-lg bg-blue-50">
        <div class="flex items-center gap-3 mb-4">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <h3 class="text-lg font-semibold text-blue-900">Setting up Local VM</h3>
        </div>
        
        <div class="space-y-3">
          <div class="bg-blue-100 p-3 rounded-lg">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-blue-800">Downloading Ubuntu 24.04.3 LTS ARM64</span>
              <span class="text-sm text-blue-600" id="download-percentage">0%</span>
            </div>
            <div class="w-full bg-blue-200 rounded-full h-2">
              <div class="bg-blue-600 h-2 rounded-full transition-all duration-300" id="download-progress-bar" style="width: 0%"></div>
            </div>
            <div class="mt-2 text-xs text-blue-700" id="download-status">
              Initializing download...
            </div>
          </div>
          
          <div class="bg-green-100 p-3 rounded-lg">
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span class="text-sm text-green-800">
                This will take 5-10 minutes. Ubuntu will install automatically, then convert to NixOS.
              </span>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  function updateDownloadProgress(output) {
    const percentageElement = document.getElementById('download-percentage');
    const progressBarElement = document.getElementById('download-progress-bar');
    const statusElement = document.getElementById('download-status');
    
    if (!percentageElement || !progressBarElement || !statusElement) return;
    
    // Parse curl progress output to extract percentage
    const lines = output.split('\n');
    let percentage = 0;
    let status = 'Downloading...';
    
    for (const line of lines) {
      if (line.includes('% Total')) {
        // Extract percentage from curl output like "5 2861M    5  148M"
        const match = line.match(/(\d+)\s+\d+M\s+\d+\s+(\d+M)/);
        if (match) {
          const currentPercent = parseInt(match[1]);
          const downloadedMB = match[2];
          percentage = currentPercent;
          status = `Downloaded ${downloadedMB} of Ubuntu 24.04.3 LTS ARM64`;
        }
      }
    }
    
    // Update UI
    percentageElement.textContent = `${percentage}%`;
    progressBarElement.style.width = `${percentage}%`;
    statusElement.textContent = status;
    
    // If download is complete, show next step
    if (percentage >= 100) {
      statusElement.textContent = 'Download complete! Starting VM...';
      progressBarElement.classList.add('bg-green-500');
    }
  }
  
  function hideDownloadProgress() {
    const statusElement = document.getElementById('local-vm-status');
    if (statusElement) {
      // Clear the progress UI - updateLocalVMUI will restore normal state
      statusElement.innerHTML = '';
    }
  }
  
  async function stopLocalVMs() {
    const stopBtn = document.getElementById('stop-vm-btn');
    stopBtn.disabled = true;
    stopBtn.textContent = 'Stopping...';
    
    try {
      const response = await fetch(`${CONFIG.LOCAL_DEV_API}/api/stop-vm`, { method: 'POST' });
      if (response.ok) {
        // Clear stable VMs set
        localDevState.stableVMs.clear();
        setTimeout(updateLocalVMStatus, 1000);
      }
    } catch (error) {
      console.error('Failed to stop local VMs:', error);
    }
  }
  
  function updateLocalVMUI() {
    const statusElement = document.getElementById('local-vm-status');
    const startBtn = document.getElementById('start-vm-btn');
    const stopBtn = document.getElementById('stop-vm-btn');
    
    if (!statusElement) return;
    
    // Store expanded state before updating
    const expandedVMs = new Set();
    localDevState.vms.forEach(vm => {
      const arrow = document.getElementById(`arrow-${vm.pid}`);
      if (arrow && arrow.getAttribute('data-expanded') === 'true') {
        expandedVMs.add(vm.pid);
      }
    });
    
    if (localDevState.vms.length === 0) {
      statusElement.innerHTML = `
        <div class="p-3 border border-blue-200 rounded-lg bg-blue-100">
          <p class="text-blue-800">No local VMs detected. Click "Start Local VM" to create one.</p>
        </div>
      `;
      startBtn.disabled = false;
      startBtn.textContent = 'Start Local VM';
      stopBtn.style.display = 'none';
    } else {
      const runningVMs = localDevState.vms.filter(vm => vm.status === 'running');
      statusElement.innerHTML = `
        <div class="space-y-3">
          ${localDevState.vms.map(vm => `
            <div class="border border-blue-200 rounded-lg bg-blue-50 overflow-hidden">
              <!-- Compact header bar -->
              <div class="flex items-center justify-between p-3 cursor-pointer hover:bg-blue-100 transition-colors" 
                   onclick="toggleVMDetails('${vm.pid}')">
                <div class="flex items-center gap-3">
                  <div class="w-2.5 h-2.5 rounded-full ${vm.status === 'running' ? 'bg-green-500' : 'bg-gray-400'}"></div>
                  <div class="flex items-center gap-4">
                    <span class="font-medium text-blue-900">${vm.name}</span>
                    <span class="text-sm text-blue-600">PID: ${vm.pid}</span>
                    <span class="text-sm text-blue-600">Port: ${vm.port}</span>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <span class="px-2 py-1 text-xs rounded-full ${vm.status === 'running' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                    ${vm.status}
                  </span>
                  <svg class="w-4 h-4 text-blue-600 transition-transform duration-200" id="arrow-${vm.pid}" data-expanded="false">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 9l6 6 6-6"/>
                  </svg>
                </div>
              </div>
              
              <!-- Expandable details section -->
              <div class="hidden border-t border-blue-200 bg-white" id="details-${vm.pid}">
                <div class="p-4 space-y-4">
                  <div class="grid grid-cols-2 gap-6 text-sm">
                    <div>
                      <p class="font-medium text-blue-900 mb-2">Process Info:</p>
                      <div class="space-y-1">
                        <p class="text-blue-700">PID: ${vm.pid}</p>
                        <p class="text-blue-700">Port: ${vm.port}</p>
                        <p class="text-blue-700">Host: ${vm.host}</p>
                      </div>
                    </div>
                    <div>
                      <p class="font-medium text-blue-900 mb-2">Status:</p>
                      <div class="space-y-1">
                        <p class="text-blue-700">Status: ${vm.status}</p>
                        <p class="text-blue-700">Uptime: ${vm.uptime || 'Unknown'}</p>
                        <p class="text-blue-700">CPU: ${vm.cpu || 0}%</p>
                        <p class="text-blue-700">Memory: ${vm.memory || 0}%</p>
                      </div>
                    </div>
                  </div>
                  
                  <div class="border-t border-blue-200 pt-4">
                    <p class="font-medium text-blue-900 mb-2">QEMU VM Details:</p>
                    <div class="bg-blue-50 p-3 rounded text-xs font-mono text-blue-800" id="qemu-details-${vm.pid}">
                      Loading QEMU details...
                    </div>
                  </div>
                  
                  <div class="border-t border-blue-200 pt-4">
                    <p class="font-medium text-blue-900 mb-2">Connection Test:</p>
                    <div class="flex gap-2">
                      <button onclick="event.stopPropagation(); testVMConnection('${vm.pid}', '${vm.host}', ${vm.port})" 
                              class="px-3 py-2 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors">
                        Test SSH Connection
                      </button>
                      <button onclick="event.stopPropagation(); testVMService('${vm.pid}', '${vm.host}', 443)" 
                              class="px-3 py-2 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors">
                        Test HTTPS (443)
                      </button>
                    </div>
                    <div class="mt-2 text-xs text-blue-700" id="connection-status-${vm.pid}">
                      Click a button to test connection
                    </div>
                  </div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
      
      if (runningVMs.length > 0) {
        startBtn.disabled = false;
        startBtn.textContent = `Start Another VM (${runningVMs.length} running)`;
        stopBtn.style.display = 'inline-block';
      } else {
        startBtn.disabled = false;
        startBtn.textContent = 'Start Local VM';
        stopBtn.style.display = 'none';
      }
      
      // Restore expanded state after updating
      expandedVMs.forEach(vmId => {
        const detailsElement = document.getElementById(`details-${vmId}`);
        const arrowElement = document.getElementById(`arrow-${vmId}`);
        if (detailsElement && arrowElement) {
          // Restore expanded state without animation
          detailsElement.classList.remove('hidden');
          arrowElement.setAttribute('data-expanded', 'true');
          arrowElement.style.transform = 'rotate(180deg)';
          // Only reload QEMU details if they're not already loaded
          const qemuDetails = document.getElementById(`qemu-details-${vmId}`);
          if (qemuDetails && qemuDetails.innerHTML.includes('Loading QEMU details...')) {
            loadQEMUDetails(vmId);
          }
        }
      });
    }
  }
  
  function addLocalVMButton() {
    const buttonContainer = document.querySelector(CONFIG.SELECTORS.BUTTON_CONTAINER);
    if (!buttonContainer) return;
    
    // Check if we already added the button
    if (buttonContainer.querySelector('[data-local-vm-btn]')) return;
    
    // Add "or" separator
    const separator = document.createElement('span');
    separator.textContent = 'or';
    separator.className = 'text-sm text-muted-foreground';
    
    // Add local VM button
    const localVMButton = createLocalVMButton();
    localVMButton.setAttribute('data-local-vm-btn', 'true');
    
    buttonContainer.appendChild(separator);
    buttonContainer.appendChild(localVMButton);
  }
  
  function addLocalVMsToXnodesList() {
    console.log('🔧 addLocalVMsToXnodesList called');
    
    // This function will add local VMs to the existing xnodes list
    // For now, we'll just update the "No Xnodes found" message
    updateNoXnodesMessage();
    
    // Also inject the local VM management section if it doesn't exist
    if (!document.getElementById('local-vm-section')) {
      console.log('🔧 Local VM section does not exist, calling showLocalVMDialog...');
      showLocalVMDialog();
    } else {
      console.log('ℹ️ Local VM section already exists');
    }
  }
  
  function updateNoXnodesMessage() {
    // Find and update the "No Xnodes found" message
    const noXnodesElements = document.querySelectorAll('p, div, span');
    noXnodesElements.forEach(element => {
      if (element.textContent && element.textContent.includes('No Xnodes found')) {
        if (localDevState.vms.length > 0) {
          element.textContent = 'Local Xnode found.';
        } else {
          element.textContent = 'No Xnodes found. Your Xnodes are saved in your browser cache. In case you are accessing from a different browser or device, please import your Xnodes.';
        }
      }
    });
  }
  
  // Toggle VM details expansion
  window.toggleVMDetails = function(vmId) {
    const detailsElement = document.getElementById(`details-${vmId}`);
    const arrowElement = document.getElementById(`arrow-${vmId}`);
    const isExpanded = arrowElement.getAttribute('data-expanded') === 'true';
    
    if (isExpanded) {
      // Collapse
      detailsElement.classList.add('hidden');
      arrowElement.setAttribute('data-expanded', 'false');
      arrowElement.style.transform = 'rotate(0deg)';
    } else {
      // Expand
      detailsElement.classList.remove('hidden');
      arrowElement.setAttribute('data-expanded', 'true');
      arrowElement.style.transform = 'rotate(180deg)';
      
      // Load QEMU details when expanding
      loadQEMUDetails(vmId);
    }
  };
  
  // Load detailed QEMU VM information
  async function loadQEMUDetails(vmId) {
    const vm = localDevState.vms.find(v => v.pid === vmId);
    if (!vm) return;
    
    const detailsElement = document.getElementById(`qemu-details-${vmId}`);
    
    try {
      // Fetch QEMU process details from our local dev server
      const response = await fetch(`${CONFIG.LOCAL_DEV_API}/api/vm-details/${vm.pid}`);
      if (response.ok) {
        const data = await response.json();
        detailsElement.innerHTML = `
          <div class="space-y-1">
            <div><strong>Command:</strong> ${data.command || 'Unknown'}</div>
            <div><strong>Memory:</strong> ${data.memory || 'Unknown'}</div>
            <div><strong>CPU:</strong> ${data.cpu || 'Unknown'}</div>
            <div><strong>Working Dir:</strong> ${data.workingDir || 'Unknown'}</div>
            <div><strong>Start Time:</strong> ${data.startTime || 'Unknown'}</div>
            <div><strong>Status:</strong> ${data.status || 'Unknown'}</div>
          </div>
        `;
      } else {
        detailsElement.innerHTML = '<span class="text-red-600">Failed to load QEMU details</span>';
      }
    } catch (error) {
      detailsElement.innerHTML = '<span class="text-red-600">Error loading details</span>';
      console.error('Failed to load QEMU details:', error);
    }
  }
  
  // Test VM SSH connection
  window.testVMConnection = async function(vmId, host, port) {
    const statusElement = document.getElementById(`connection-status-${vmId}`);
    statusElement.innerHTML = 'Testing SSH connection...';
    
    try {
      const response = await fetch(`${CONFIG.LOCAL_DEV_API}/api/test-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, port, type: 'ssh' })
      });
      
      if (response.ok) {
        const data = await response.json();
        statusElement.innerHTML = `SSH: ${data.success ? '✅ Connected' : '❌ Failed'} - ${data.message}`;
      } else {
        statusElement.innerHTML = 'SSH: ❌ Test failed';
      }
    } catch (error) {
      statusElement.innerHTML = 'SSH: ❌ Error during test';
    }
  };
  
  // Test VM HTTPS service
  window.testVMService = async function(vmId, host, port) {
    const statusElement = document.getElementById(`connection-status-${vmId}`);
    statusElement.innerHTML = 'Testing HTTPS service...';
    
    try {
      const response = await fetch(`${CONFIG.LOCAL_DEV_API}/api/test-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, port, type: 'https' })
      });
      
      if (response.ok) {
        const data = await response.json();
        statusElement.innerHTML = `HTTPS: ${data.success ? '✅ Connected' : '❌ Failed'} - ${data.message}`;
      } else {
        statusElement.innerHTML = 'HTTPS: ❌ Test failed';
      }
    } catch (error) {
      statusElement.innerHTML = 'HTTPS: ❌ Error during test';
    }
  };
  
  function skipWalletAuthentication() {
    // Find wallet connection elements and hide them
    const walletElements = document.querySelectorAll('[data-testid*="wallet"], [data-testid*="connect"], .wallet-connect');
    walletElements.forEach(el => {
      if (el.style) {
        el.style.display = 'none';
      }
    });
    
    // Enable buttons that were disabled due to no wallet
    const disabledButtons = document.querySelectorAll('button:disabled');
    disabledButtons.forEach(btn => {
      if (btn.textContent.includes('Deploy') || btn.textContent.includes('Import')) {
        btn.disabled = false;
        btn.classList.remove('opacity-50', 'cursor-not-allowed');
      }
    });
  }
  
  function injectCustomCSS() {
    // Check if we already injected CSS
    if (document.getElementById('opendev-custom-css')) return;
    
    const style = document.createElement('style');
    style.id = 'opendev-custom-css';
    style.textContent = `
      /* Make mobile bottom bar icons bigger */
      @media (max-width: 768px) {
        /* Bottom navigation icons */
        nav[role="navigation"] svg,
        nav[role="navigation"] .w-6,
        nav[role="navigation"] .h-6 {
          width: 1.75rem !important;
          height: 1.75rem !important;
        }
        
        /* Bottom navigation text */
        nav[role="navigation"] .text-xs {
          font-size: 0.875rem !important;
        }
        
        /* Bottom navigation padding */
        nav[role="navigation"] a,
        nav[role="navigation"] button {
          padding: 0.75rem 0.5rem !important;
        }
      }
      
      /* Improve collapsible VM styling */
      #local-vm-section .border-blue-200 {
        border-color: rgb(191 219 254) !important;
      }
      
      #local-vm-section .bg-blue-50 {
        background-color: rgb(239 246 255) !important;
      }
      
      #local-vm-section .bg-blue-100 {
        background-color: rgb(219 234 254) !important;
      }
      
      #local-vm-section .hover\\:bg-blue-100:hover {
        background-color: rgb(191 219 254) !important;
      }
      
      /* Smooth transitions */
      #local-vm-section * {
        transition: all 0.2s ease-in-out;
      }
    `;
    
    document.head.appendChild(style);
  }
  
  // Main initialization function
  async function initializeLocalDev() {
    if (localDevState.isInitialized) return;
    
    localDevState.isLocalDev = isLocalDevelopment();
    
    if (!localDevState.isLocalDev) {
      console.log('OpenDev IDE: Not in local development mode');
      return;
    }
    
    console.log('🚀 OpenDev IDE: Initializing local development mode');
    
    // Check if we're on the main page
    if (!isOnMainPage()) {
      console.log('❌ Not on main page, skipping initialization');
      return;
    }
    
    // Log current page state for debugging
    logPageState();
    
    try {
      // First check if the page is ready
      if (!isPageReady()) {
        console.log('⏳ Page not ready yet, waiting for elements...');
        // Wait for the main page to load with increased timeout
        console.log('Waiting for main page elements...');
        const mainPage = await waitForElement(CONFIG.SELECTORS.MAIN_PAGE, 15000);
        console.log('Main page found:', mainPage);
        
        // Double-check that everything is ready
        if (!isPageReady()) {
          throw new Error('Page elements not fully ready after waiting');
        }
      }
      
      // Add local VM button
      addLocalVMButton();
      
      // Add local VMs to xnodes list
      addLocalVMsToXnodesList();
      
      // Skip wallet authentication
      skipWalletAuthentication();
      
      // Inject custom CSS
      injectCustomCSS();
      
      // Start polling for VM status
      updateLocalVMStatus();
      setInterval(updateLocalVMStatus, CONFIG.POLL_INTERVAL);
      
      localDevState.isInitialized = true;
      console.log('✅ OpenDev IDE: Local development mode initialized');
      
    } catch (error) {
      console.error('❌ OpenDev IDE: Failed to initialize:', error);
      
      // Log page state again for debugging
      console.log('🔍 Page state after error:');
      logPageState();
      
      // Try to recover by waiting a bit longer and retrying
      console.log('🔄 Attempting recovery...');
      setTimeout(() => {
        if (!localDevState.isInitialized) {
          console.log('🔄 Retrying initialization...');
          initializeLocalDev();
        }
      }, 3000);
    }
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLocalDev);
  } else {
    initializeLocalDev();
  }
  
  // Also try to initialize when the page changes (for SPA navigation)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      console.log('🔄 URL changed, reinitializing...');
      setTimeout(initializeLocalDev, 100);
    }
  }).observe(document, { subtree: true, childList: true });
  
  // Force initialization after a delay to ensure the page is fully loaded
  setTimeout(initializeLocalDev, 2000);
  
  // Additional fallback initialization attempts
  setTimeout(initializeLocalDev, 5000);
  setTimeout(initializeLocalDev, 10000);
  
  // Periodic page state checker for debugging
  setInterval(() => {
    if (!localDevState.isInitialized) {
      console.log('🔍 Periodic page state check:');
      logPageState();
      
      // Try to initialize if we're on the right page
      if (isOnMainPage()) {
        console.log('🎯 Page looks ready, attempting initialization...');
        initializeLocalDev();
      }
    }
  }, 5000);
  
  // Listen for any DOM changes that might indicate the page is ready
  new MutationObserver((mutations) => {
    // Check if any of our target elements appeared
    if (isOnMainPage() && !localDevState.isInitialized) {
      console.log('🎯 Target elements detected, initializing...');
      initializeLocalDev();
    }
  }).observe(document.body, {
    childList: true,
    subtree: true
  });
  
})();
