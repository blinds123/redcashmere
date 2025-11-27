const { chromium } = require('playwright');

(async () => {
  console.log('=== FINAL E2E VERIFICATION ===');
  console.log('Site: https://redcashmere.netlify.app\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  let passed = 0, failed = 0;

  // Test 1: Page loads
  console.log('1. Page Load Test...');
  await page.goto('https://redcashmere.netlify.app', { waitUntil: 'networkidle', timeout: 30000 });
  const title = await page.title();
  if (title.includes('Cashmere')) {
    console.log('   ✓ PASS - Title:', title);
    passed++;
  } else {
    console.log('   ✗ FAIL');
    failed++;
  }

  // Test 2: Influencer section
  console.log('2. Influencer Section Test...');
  const influencers = await page.locator('text=WORN BY YOUR FAVORITES').count();
  if (influencers > 0) {
    console.log('   ✓ PASS - Influencer section found');
    passed++;
  } else {
    console.log('   ✗ FAIL - Not found');
    failed++;
  }

  // Test 3: Images (scroll to load lazy images first)
  console.log('3. Image Load Test...');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2000);
  const imgs = await page.evaluate(() => {
    const images = document.querySelectorAll('img');
    let broken = 0;
    images.forEach(img => {
      if (img.naturalWidth === 0) broken++;
    });
    return { total: images.length, broken };
  });
  if (imgs.broken === 0) {
    console.log('   ✓ PASS -', imgs.total, 'images, 0 broken');
    passed++;
  } else {
    console.log('   ✗ FAIL -', imgs.broken, 'broken');
    failed++;
  }

  // Test 4: No crypto text
  console.log('4. Crypto Removal Test...');
  const content = await page.textContent('body');
  const hasCrypto = content.toLowerCase().includes('cryptocurrency');
  if (!hasCrypto) {
    console.log('   ✓ PASS - No crypto mentions');
    passed++;
  } else {
    console.log('   ✗ FAIL - Crypto still present');
    failed++;
  }

  // Test 5: No horizontal scroll
  console.log('5. Mobile Scroll Test...');
  const hasHScroll = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  if (!hasHScroll) {
    console.log('   ✓ PASS - No horizontal scroll');
    passed++;
  } else {
    console.log('   ✗ FAIL - Horizontal scroll detected');
    failed++;
  }

  // Test 6: Checkout proxy function (verifies CORS bypass works)
  console.log('6. Checkout Function Test...');
  try {
    const checkoutResult = await page.evaluate(async () => {
      const res = await fetch('/.netlify/functions/buy-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountUSD: 59 })
      });
      return res.ok ? await res.json() : { error: 'Request failed' };
    });
    if (checkoutResult && checkoutResult.success && checkoutResult.exchangeUrl) {
      console.log('   ✓ PASS - Checkout working, got exchange URL');
      passed++;
    } else {
      console.log('   ✗ FAIL - Checkout error:', checkoutResult.error || 'No exchange URL');
      failed++;
    }
  } catch (e) {
    console.log('   ✗ FAIL -', e.message);
    failed++;
  }

  // Test 7: CTA buttons
  console.log('7. CTA Buttons Test...');
  const ctaCount = await page.locator('button').count();
  if (ctaCount >= 2) {
    console.log('   ✓ PASS -', ctaCount, 'buttons found');
    passed++;
  } else {
    console.log('   ✗ FAIL');
    failed++;
  }

  // Screenshot
  await page.screenshot({ path: 'output/tests/final-mobile-view.png', fullPage: true });
  console.log('\n   Screenshot saved: output/tests/final-mobile-view.png');

  await browser.close();

  console.log('\n=== RESULTS ===');
  console.log('Passed:', passed, '/ 7');
  console.log('Failed:', failed);
  console.log(failed === 0 ? '\n✓ ALL TESTS PASSED!' : '\n⚠ Some tests need attention');
})();
