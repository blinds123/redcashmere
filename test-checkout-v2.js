const { chromium } = require('playwright');

(async () => {
  console.log('=== CHECKOUT FLOW TEST ===\n');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  
  await page.goto('https://redcashmere.netlify.app', { waitUntil: 'networkidle', timeout: 30000 });
  
  // Test 1: Click $59 "ADD TO CART" button
  console.log('1. Testing $59 "ADD TO CART" flow...');
  const addToCartBtn = page.locator('button:has-text("ADD TO CART - $59")').first();
  
  if (await addToCartBtn.count() > 0) {
    console.log('   Found ADD TO CART button');
    
    // Check for navigation or new tab
    const [newPage] = await Promise.all([
      browser.contexts()[0].waitForEvent('page', { timeout: 10000 }).catch(() => null),
      addToCartBtn.click()
    ]);
    
    await page.waitForTimeout(2000);
    
    if (newPage) {
      await newPage.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      const url = newPage.url();
      console.log('   New tab URL:', url);
      if (url.includes('simpleswap')) {
        console.log('   ✓ PASS - Opens SimpleSwap in new tab');
      }
    } else {
      const url = page.url();
      if (url.includes('simpleswap')) {
        console.log('   ✓ PASS - Redirects to SimpleSwap');
      } else {
        // Check if loading indicator or error
        const body = await page.textContent('body');
        if (body.includes('Processing') || body.includes('redirect')) {
          console.log('   ⚠ Processing/redirecting...');
        } else {
          console.log('   → Stayed on page, checking console errors...');
        }
      }
    }
  } else {
    console.log('   ✗ ADD TO CART button not found');
  }
  
  // Take final screenshot
  await page.screenshot({ path: 'output/tests/checkout-test.png', fullPage: true });
  console.log('\n   Screenshot saved: output/tests/checkout-test.png');
  
  await browser.close();
  console.log('\n=== TEST COMPLETE ===');
})();
