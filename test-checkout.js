const { chromium } = require('playwright');

(async () => {
  console.log('=== CHECKOUT FLOW TEST ===\n');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  
  await page.goto('https://redcashmere.netlify.app', { waitUntil: 'networkidle', timeout: 30000 });
  
  // Test 1: Click $59 "Ship Today" button
  console.log('1. Testing $59 "Ship Today" flow...');
  const shipTodayBtn = page.locator('button:has-text("Ship Today")').first();
  if (await shipTodayBtn.count() > 0) {
    // Listen for navigation
    const [response] = await Promise.all([
      page.waitForNavigation({ timeout: 10000 }).catch(() => null),
      shipTodayBtn.click()
    ]);
    
    const url = page.url();
    if (url.includes('simpleswap') || url.includes('redcashmere')) {
      console.log('   URL after click:', url);
      if (url.includes('simpleswap')) {
        console.log('   ✓ PASS - Redirects to SimpleSwap');
      } else {
        console.log('   ⚠ Still on page (popup may be showing)');
        // Check if popup is visible
        const popup = page.locator('.order-bump-popup:visible');
        if (await popup.count() > 0) {
          console.log('   → Popup is visible');
        }
      }
    }
  } else {
    console.log('   ✗ "Ship Today" button not found');
  }
  
  // Go back to test $19 flow
  await page.goto('https://redcashmere.netlify.app', { waitUntil: 'networkidle', timeout: 30000 });
  
  // Test 2: Click $19 "Pre-Order" button
  console.log('\n2. Testing $19 "Pre-Order" flow...');
  const preorderBtn = page.locator('button:has-text("Pre-Order")').first();
  if (await preorderBtn.count() > 0) {
    await preorderBtn.click();
    await page.waitForTimeout(1000);
    
    // Check if popup appeared
    const popup = page.locator('.order-bump-popup:visible, [class*="popup"]:visible, [class*="modal"]:visible');
    if (await popup.count() > 0) {
      console.log('   ✓ PASS - Popup appeared');
      // Take screenshot of popup
      await page.screenshot({ path: 'output/tests/checkout-popup.png' });
      console.log('   Screenshot saved: output/tests/checkout-popup.png');
    } else {
      console.log('   ✗ FAIL - No popup appeared');
    }
  } else {
    console.log('   ✗ "Pre-Order" button not found');
  }
  
  // Test 3: Verify pool server is accessible via curl (not browser)
  console.log('\n3. Pool server direct test (curl):');
  
  await browser.close();
  console.log('\n=== TEST COMPLETE ===');
})();
