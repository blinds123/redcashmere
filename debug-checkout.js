const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  // Capture console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push(msg.type() + ': ' + msg.text());
  });

  // Capture network requests
  const requests = [];
  page.on('request', req => {
    if (req.url().includes('simpleswap') || req.url().includes('render')) {
      requests.push('REQ: ' + req.method() + ' ' + req.url());
    }
  });
  page.on('requestfailed', req => {
    requests.push('FAIL: ' + req.url() + ' - ' + req.failure().errorText);
  });

  await page.goto('https://redcashmere.netlify.app', { waitUntil: 'networkidle', timeout: 30000 });

  // Click the $59 button
  const btn = page.locator('button:has-text("ADD TO CART - $59")').first();
  await btn.click();

  // Wait a bit for any async operations
  await page.waitForTimeout(5000);

  console.log('=== Console Messages ===');
  consoleMessages.forEach(m => console.log(m));

  console.log('\n=== Network Requests ===');
  requests.forEach(r => console.log(r));

  await browser.close();
})();
