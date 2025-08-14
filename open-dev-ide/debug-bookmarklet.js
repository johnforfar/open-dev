// Debug script for bookmarklet functionality
console.log('🔍 Debug: Testing bookmarklet functionality...');

// Test 1: Check if we're on localhost
console.log('📍 Hostname:', window.location.hostname);
console.log('📍 Port:', window.location.port);
console.log('📍 Full URL:', window.location.href);

// Test 2: Check document state
console.log('📍 Document ready state:', document.readyState);
console.log('📍 Body children count:', document.body.children.length);

// Test 3: Look for key elements
const mainPageElements = document.querySelectorAll('.flex.flex-col.gap-5');
console.log('📍 Main page elements found:', mainPageElements.length);

const xnodesElements = document.querySelectorAll('[class*="@container"], div[class*="container"]');
console.log('📍 Xnodes container elements found:', xnodesElements.length);

const deployButtons = document.querySelectorAll('button[class*="bg-blue"], button[class*="bg-primary"]');
console.log('📍 Deploy buttons found:', deployButtons.length);

// Test 4: Look for "My Xnodes" text
const myXnodesElements = Array.from(document.querySelectorAll('*')).filter(el => 
  el.textContent && el.textContent.includes('My Xnodes')
);
console.log('📍 "My Xnodes" elements found:', myXnodesElements.length);
myXnodesElements.forEach((el, i) => {
  console.log(`  ${i}:`, el.tagName, el.className, el.textContent.trim());
});

// Test 5: Check for any flex containers
const flexElements = document.querySelectorAll('[class*="flex"]');
console.log('📍 Flex elements found:', flexElements.length);

// Test 6: Look for the specific structure we need
const potentialMainSections = Array.from(document.querySelectorAll('*')).filter(el => {
  if (el.children.length < 2) return false;
  const hasTitle = Array.from(el.children).some(child => 
    child.textContent && child.textContent.includes('My Xnodes')
  );
  const hasButtons = Array.from(el.children).some(child => 
    child.querySelector && child.querySelector('button')
  );
  return hasTitle && hasButtons;
});

console.log('📍 Potential main sections found:', potentialMainSections.length);
potentialMainSections.forEach((el, i) => {
  console.log(`  ${i}:`, el.tagName, el.className);
  console.log(`    Children:`, el.children.length);
  console.log(`    Text:`, el.textContent.substring(0, 100));
});

console.log('🔍 Debug complete!');
