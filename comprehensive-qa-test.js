const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://redcashmere.netlify.app';
const SCREENSHOT_DIR = '/Users/nelsonchan/Downloads/red cashmere final/output/tests/qa-screenshots';
const REPORT_PATH = '/Users/nelsonchan/Downloads/red cashmere final/output/agents/qa-report.json';

const testResults = {
  timestamp: new Date().toISOString(),
  url: BASE_URL,
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0
  },
  tests: [],
  screenshots: [],
  errors: []
};

function logTest(name, status, details = {}) {
  const test = {
    name,
    status, // 'PASS', 'FAIL', 'WARN'
    timestamp: new Date().toISOString(),
    ...details
  };
  testResults.tests.push(test);
  testResults.summary.total++;

  if (status === 'PASS') {
    testResults.summary.passed++;
    console.log(`✓ ${name}`);
  } else if (status === 'FAIL') {
    testResults.summary.failed++;
    console.log(`✗ ${name}`);
    if (details.error) console.error(`  Error: ${details.error}`);
  } else if (status === 'WARN') {
    testResults.summary.warnings++;
    console.log(`⚠ ${name}`);
    if (details.warning) console.log(`  Warning: ${details.warning}`);
  }
}

function logScreenshot(filename, description) {
  testResults.screenshots.push({ filename, description, timestamp: new Date().toISOString() });
  console.log(`📸 Screenshot saved: ${filename}`);
}

async function runTests() {
  console.log('='.repeat(80));
  console.log('COMPREHENSIVE QA E2E TEST SUITE');
  console.log('='.repeat(80));
  console.log(`Target URL: ${BASE_URL}`);
  console.log(`Start Time: ${new Date().toISOString()}\n`);

  const browser = await chromium.launch({ headless: true });

  try {
    // ========================================
    // 1. VISUAL VERIFICATION TESTS
    // ========================================
    console.log('\n--- VISUAL VERIFICATION TESTS ---\n');

    // Desktop viewport
    const desktopContext = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    });
    const desktopPage = await desktopContext.newPage();

    try {
      const response = await desktopPage.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });

      if (response.status() === 200) {
        logTest('Page loads successfully (HTTP 200)', 'PASS', { statusCode: response.status() });
      } else {
        logTest('Page loads successfully (HTTP 200)', 'FAIL', {
          error: `HTTP ${response.status()}`,
          statusCode: response.status()
        });
      }

      // Wait for page to be fully loaded
      await desktopPage.waitForLoadState('load');
      await desktopPage.waitForTimeout(2000); // Extra time for any animations

      // Full page desktop screenshot
      await desktopPage.screenshot({
        path: path.join(SCREENSHOT_DIR, 'fullpage-desktop-1920x1080.png'),
        fullPage: true
      });
      logScreenshot('fullpage-desktop-1920x1080.png', 'Full page desktop view (1920x1080)');

      // Hero section screenshot
      const heroSelector = 'header, .hero, section:first-of-type, main > div:first-child';
      try {
        await desktopPage.locator(heroSelector).first().screenshot({
          path: path.join(SCREENSHOT_DIR, 'hero-section-desktop.png')
        });
        logScreenshot('hero-section-desktop.png', 'Hero section desktop');
      } catch (e) {
        console.log(`  Note: Could not capture hero with selector "${heroSelector}", capturing top section instead`);
        await desktopPage.screenshot({
          path: path.join(SCREENSHOT_DIR, 'hero-section-desktop.png'),
          clip: { x: 0, y: 0, width: 1920, height: 800 }
        });
        logScreenshot('hero-section-desktop.png', 'Hero section desktop (top 800px)');
      }

    } catch (error) {
      logTest('Desktop page load and screenshots', 'FAIL', { error: error.message });
      testResults.errors.push({ context: 'Desktop page load', error: error.message });
    }

    // Mobile viewport
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      isMobile: true,
      hasTouch: true
    });
    const mobilePage = await mobileContext.newPage();

    try {
      await mobilePage.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
      await mobilePage.waitForLoadState('load');
      await mobilePage.waitForTimeout(2000);

      // Full page mobile screenshot
      await mobilePage.screenshot({
        path: path.join(SCREENSHOT_DIR, 'fullpage-mobile-390x844.png'),
        fullPage: true
      });
      logScreenshot('fullpage-mobile-390x844.png', 'Full page mobile view (390x844 iPhone)');

    } catch (error) {
      logTest('Mobile page load and screenshots', 'FAIL', { error: error.message });
      testResults.errors.push({ context: 'Mobile page load', error: error.message });
    }

    // ========================================
    // 2. FUNCTIONAL TESTS - LANDING PAGE
    // ========================================
    console.log('\n--- LANDING PAGE FUNCTIONAL TESTS ---\n');

    // Title check
    const title = await desktopPage.title();
    if (title.toLowerCase().includes('cashmere')) {
      logTest('Title contains "Cashmere"', 'PASS', { title });
    } else {
      logTest('Title contains "Cashmere"', 'WARN', {
        warning: `Title is "${title}" - does not contain "Cashmere"`,
        title
      });
    }

    // Hero image check
    try {
      const heroImages = await desktopPage.locator('img').all();
      let heroImageLoaded = false;
      let brokenImages = [];

      for (let i = 0; i < Math.min(heroImages.length, 5); i++) {
        const img = heroImages[i];
        const src = await img.getAttribute('src');
        const naturalWidth = await img.evaluate(el => el.naturalWidth);

        if (naturalWidth > 0) {
          heroImageLoaded = true;
          break;
        } else {
          brokenImages.push(src);
        }
      }

      if (heroImageLoaded) {
        logTest('Hero image loads (not broken)', 'PASS');
      } else {
        logTest('Hero image loads (not broken)', 'FAIL', {
          error: 'No valid hero images found',
          brokenImages
        });
      }
    } catch (error) {
      logTest('Hero image loads (not broken)', 'FAIL', { error: error.message });
    }

    // CTA buttons check
    try {
      const ctaSelectors = [
        'button:has-text("ADD TO CART")',
        'button:has-text("PRE-ORDER")',
        'a:has-text("ADD TO CART")',
        'a:has-text("PRE-ORDER")',
        '.cta-button',
        '[class*="cta"]',
        'button[class*="buy"]',
        'button[class*="order"]'
      ];

      let ctaFound = false;
      let foundButtons = [];

      for (const selector of ctaSelectors) {
        const buttons = await desktopPage.locator(selector).all();
        if (buttons.length > 0) {
          ctaFound = true;
          for (const btn of buttons) {
            const text = await btn.textContent();
            const isVisible = await btn.isVisible();
            foundButtons.push({ text: text.trim(), visible: isVisible, selector });
          }
        }
      }

      if (ctaFound && foundButtons.some(b => b.visible)) {
        logTest('CTA buttons visible and clickable', 'PASS', { buttons: foundButtons });
      } else if (ctaFound) {
        logTest('CTA buttons visible and clickable', 'WARN', {
          warning: 'Buttons found but may not be visible',
          buttons: foundButtons
        });
      } else {
        logTest('CTA buttons visible and clickable', 'FAIL', {
          error: 'No CTA buttons found',
          searchedSelectors: ctaSelectors
        });
      }
    } catch (error) {
      logTest('CTA buttons visible and clickable', 'FAIL', { error: error.message });
    }

    // ========================================
    // 3. MOBILE RESPONSIVE TESTS
    // ========================================
    console.log('\n--- MOBILE RESPONSIVE TESTS ---\n');

    try {
      // Check for horizontal scrolling
      const hasHorizontalScroll = await mobilePage.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      if (!hasHorizontalScroll) {
        logTest('No horizontal scrolling at 390px viewport', 'PASS');
      } else {
        const scrollWidth = await mobilePage.evaluate(() => document.documentElement.scrollWidth);
        logTest('No horizontal scrolling at 390px viewport', 'FAIL', {
          error: `Horizontal scroll detected`,
          scrollWidth,
          viewportWidth: 390
        });
      }

      // Check viewport fit
      const elementsOutsideViewport = await mobilePage.evaluate(() => {
        const elements = document.querySelectorAll('*');
        const viewport = window.innerWidth;
        let outsideCount = 0;
        const outsideElements = [];

        elements.forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.right > viewport) {
            outsideCount++;
            if (outsideElements.length < 5) {
              outsideElements.push({
                tag: el.tagName,
                class: el.className,
                right: rect.right
              });
            }
          }
        });

        return { outsideCount, outsideElements };
      });

      if (elementsOutsideViewport.outsideCount === 0) {
        logTest('All elements fit within viewport', 'PASS');
      } else {
        logTest('All elements fit within viewport', 'WARN', {
          warning: `${elementsOutsideViewport.outsideCount} elements extend beyond viewport`,
          ...elementsOutsideViewport
        });
      }

      // Check touch target sizes
      const smallTouchTargets = await mobilePage.evaluate(() => {
        const interactiveElements = document.querySelectorAll('button, a, input, select, textarea, [onclick], [role="button"]');
        const small = [];

        interactiveElements.forEach(el => {
          const rect = el.getBoundingClientRect();
          if ((rect.width < 44 || rect.height < 44) && rect.width > 0 && rect.height > 0) {
            small.push({
              tag: el.tagName,
              class: el.className,
              width: rect.width,
              height: rect.height,
              text: el.textContent.trim().substring(0, 30)
            });
          }
        });

        return small;
      });

      if (smallTouchTargets.length === 0) {
        logTest('Touch targets are 44px minimum', 'PASS');
      } else {
        logTest('Touch targets are 44px minimum', 'WARN', {
          warning: `${smallTouchTargets.length} touch targets smaller than 44px`,
          smallTargets: smallTouchTargets.slice(0, 10)
        });
      }

    } catch (error) {
      logTest('Mobile responsive tests', 'FAIL', { error: error.message });
      testResults.errors.push({ context: 'Mobile responsive', error: error.message });
    }

    // ========================================
    // 4. CHECKOUT FLOW TESTS
    // ========================================
    console.log('\n--- CHECKOUT FLOW TESTS ---\n');

    // Return to desktop page for checkout flow
    try {
      // Look for $59 ADD TO CART button
      const addToCartSelectors = [
        'button:has-text("ADD TO CART")',
        'button:has-text("$59")',
        'button:has-text("59")',
        '[onclick*="addToCart"]',
        '.add-to-cart'
      ];

      let addToCartButton = null;
      for (const selector of addToCartSelectors) {
        const buttons = await desktopPage.locator(selector).all();
        for (const btn of buttons) {
          const text = await btn.textContent();
          if (text.includes('59') || text.includes('ADD TO CART')) {
            addToCartButton = btn;
            break;
          }
        }
        if (addToCartButton) break;
      }

      if (addToCartButton) {
        // Take screenshot before click
        await desktopPage.screenshot({
          path: path.join(SCREENSHOT_DIR, 'before-add-to-cart.png'),
          fullPage: false
        });
        logScreenshot('before-add-to-cart.png', 'Before clicking ADD TO CART');

        // Click the button
        await addToCartButton.click();
        await desktopPage.waitForTimeout(2000);

        // Take screenshot after click
        await desktopPage.screenshot({
          path: path.join(SCREENSHOT_DIR, 'after-add-to-cart.png'),
          fullPage: false
        });
        logScreenshot('after-add-to-cart.png', 'After clicking ADD TO CART');

        // Check what happened
        const currentUrl = desktopPage.url();
        const popupVisible = await desktopPage.locator('[class*="popup"], [class*="modal"], [id*="popup"], [id*="modal"]').count() > 0;

        logTest('Click $59 "ADD TO CART" button', 'PASS', {
          action: popupVisible ? 'Popup appeared' : 'Button clicked',
          urlAfter: currentUrl,
          popupVisible
        });
      } else {
        logTest('Click $59 "ADD TO CART" button', 'FAIL', {
          error: 'ADD TO CART button not found',
          searchedSelectors: addToCartSelectors
        });
      }

    } catch (error) {
      logTest('Click $59 "ADD TO CART" button', 'FAIL', { error: error.message });
    }

    // Look for PRE-ORDER button
    try {
      const preOrderSelectors = [
        'button:has-text("PRE-ORDER")',
        'button:has-text("$19")',
        'button:has-text("19")',
        '[onclick*="preOrder"]',
        '.pre-order'
      ];

      let preOrderButton = null;
      for (const selector of preOrderSelectors) {
        const buttons = await desktopPage.locator(selector).all();
        for (const btn of buttons) {
          const text = await btn.textContent();
          if (text.includes('19') || text.includes('PRE-ORDER')) {
            preOrderButton = btn;
            break;
          }
        }
        if (preOrderButton) break;
      }

      if (preOrderButton) {
        // Take screenshot before click
        await desktopPage.screenshot({
          path: path.join(SCREENSHOT_DIR, 'before-pre-order.png'),
          fullPage: false
        });
        logScreenshot('before-pre-order.png', 'Before clicking PRE-ORDER');

        await preOrderButton.click();
        await desktopPage.waitForTimeout(2000);

        // Take screenshot after click
        await desktopPage.screenshot({
          path: path.join(SCREENSHOT_DIR, 'after-pre-order.png'),
          fullPage: false
        });
        logScreenshot('after-pre-order.png', 'After clicking PRE-ORDER');

        // Check for order bump popup
        const popupSelectors = [
          '[class*="popup"]',
          '[class*="modal"]',
          '[id*="popup"]',
          '[id*="modal"]',
          '[class*="order-bump"]'
        ];

        let popupFound = false;
        for (const selector of popupSelectors) {
          if (await desktopPage.locator(selector).count() > 0) {
            popupFound = true;

            // Screenshot the popup
            await desktopPage.locator(selector).first().screenshot({
              path: path.join(SCREENSHOT_DIR, 'order-bump-popup.png')
            });
            logScreenshot('order-bump-popup.png', 'Order bump popup');
            break;
          }
        }

        if (popupFound) {
          logTest('Verify order bump popup appears', 'PASS');

          // Try to find and click popup buttons
          const popupButtons = await desktopPage.locator('[class*="popup"] button, [class*="modal"] button').all();
          if (popupButtons.length > 0) {
            logTest('Click through popup buttons', 'PASS', {
              buttonCount: popupButtons.length
            });

            // Click first button (usually "Yes" or "Accept")
            if (popupButtons[0]) {
              await popupButtons[0].click();
              await desktopPage.waitForTimeout(2000);

              // Check for redirect
              const finalUrl = desktopPage.url();
              if (finalUrl.includes('simpleswap')) {
                logTest('Verify redirect to SimpleSwap', 'PASS', { finalUrl });
              } else {
                logTest('Verify redirect to SimpleSwap', 'FAIL', {
                  error: 'No redirect to SimpleSwap detected',
                  finalUrl
                });
              }

              // Final screenshot
              await desktopPage.screenshot({
                path: path.join(SCREENSHOT_DIR, 'final-redirect.png'),
                fullPage: false
              });
              logScreenshot('final-redirect.png', 'Final page after popup interaction');
            }
          } else {
            logTest('Click through popup buttons', 'WARN', {
              warning: 'No buttons found in popup'
            });
          }
        } else {
          logTest('Verify order bump popup appears', 'FAIL', {
            error: 'No popup found after clicking PRE-ORDER'
          });
        }

      } else {
        logTest('Click $19 "PRE-ORDER" button', 'FAIL', {
          error: 'PRE-ORDER button not found',
          searchedSelectors: preOrderSelectors
        });
      }

    } catch (error) {
      logTest('PRE-ORDER checkout flow', 'FAIL', { error: error.message });
      testResults.errors.push({ context: 'PRE-ORDER flow', error: error.message });
    }

    // ========================================
    // 5. IMAGE VALIDATION TESTS
    // ========================================
    console.log('\n--- IMAGE VALIDATION TESTS ---\n');

    try {
      const allImages = await desktopPage.locator('img').all();
      let totalImages = allImages.length;
      let loadedImages = 0;
      let brokenImages = [];

      for (const img of allImages) {
        try {
          const src = await img.getAttribute('src');
          const naturalWidth = await img.evaluate(el => el.naturalWidth);

          if (naturalWidth > 0) {
            loadedImages++;
          } else {
            brokenImages.push(src);
          }
        } catch (e) {
          // Skip images that can't be evaluated
        }
      }

      if (brokenImages.length === 0) {
        logTest('Check all images load (naturalWidth > 0)', 'PASS', {
          totalImages,
          loadedImages
        });
      } else {
        logTest('Check all images load (naturalWidth > 0)', 'FAIL', {
          error: `${brokenImages.length} broken images found`,
          totalImages,
          loadedImages,
          brokenImages: brokenImages.slice(0, 10)
        });
      }

      logTest('No broken images', brokenImages.length === 0 ? 'PASS' : 'FAIL', {
        brokenCount: brokenImages.length
      });

      // Product images
      const productImages = await desktopPage.locator('img[src*="product"], img[alt*="product"], [class*="product"] img').all();
      if (productImages.length > 0) {
        logTest('Product images display correctly', 'PASS', {
          count: productImages.length
        });
      } else {
        logTest('Product images display correctly', 'WARN', {
          warning: 'No product images found with common selectors'
        });
      }

      // Testimonial images
      const testimonialImages = await desktopPage.locator('img[src*="testimonial"], img[alt*="testimonial"], [class*="testimonial"] img').all();
      if (testimonialImages.length > 0) {
        logTest('Testimonial images display correctly', 'PASS', {
          count: testimonialImages.length
        });
      } else {
        logTest('Testimonial images display correctly', 'WARN', {
          warning: 'No testimonial images found with common selectors'
        });
      }

    } catch (error) {
      logTest('Image validation tests', 'FAIL', { error: error.message });
      testResults.errors.push({ context: 'Image validation', error: error.message });
    }

    // ========================================
    // 6. POOL SERVER TEST
    // ========================================
    console.log('\n--- POOL SERVER TEST ---\n');

    try {
      const poolResponse = await desktopPage.evaluate(async () => {
        try {
          const response = await fetch('https://simpleswap-automation-1.onrender.com/health/pools');
          const data = await response.json();
          return { success: true, status: response.status, data };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      if (poolResponse.success) {
        const hasWallets = poolResponse.data.pools && poolResponse.data.pools.some(pool => pool.wallet);

        if (hasWallets) {
          logTest('Pool server health check - pools have wallets', 'PASS', {
            poolCount: poolResponse.data.pools.length,
            pools: poolResponse.data.pools
          });
        } else {
          logTest('Pool server health check - pools have wallets', 'WARN', {
            warning: 'Pools found but no wallets assigned',
            data: poolResponse.data
          });
        }
      } else {
        logTest('Pool server health check - pools have wallets', 'FAIL', {
          error: poolResponse.error
        });
      }

    } catch (error) {
      logTest('Pool server health check', 'FAIL', { error: error.message });
      testResults.errors.push({ context: 'Pool server test', error: error.message });
    }

    // ========================================
    // 7. CORS TEST
    // ========================================
    console.log('\n--- CORS TEST ---\n');

    try {
      const corsResponse = await desktopPage.evaluate(async () => {
        try {
          const response = await fetch('https://simpleswap-automation-1.onrender.com/buy-now', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amountUSD: 59 })
          });
          const data = await response.json();
          return { success: true, status: response.status, data };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      if (corsResponse.success) {
        logTest('CORS test - buy-now endpoint accessible from browser', 'PASS', {
          status: corsResponse.status,
          response: corsResponse.data
        });
      } else {
        logTest('CORS test - buy-now endpoint accessible from browser', 'FAIL', {
          error: corsResponse.error
        });
      }

    } catch (error) {
      logTest('CORS test', 'FAIL', { error: error.message });
      testResults.errors.push({ context: 'CORS test', error: error.message });
    }

    // Cleanup
    await desktopContext.close();
    await mobileContext.close();

  } catch (error) {
    console.error('CRITICAL ERROR:', error);
    testResults.errors.push({ context: 'Test suite execution', error: error.message, stack: error.stack });
  } finally {
    await browser.close();
  }

  // ========================================
  // GENERATE REPORT
  // ========================================
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Tests: ${testResults.summary.total}`);
  console.log(`Passed: ${testResults.summary.passed}`);
  console.log(`Failed: ${testResults.summary.failed}`);
  console.log(`Warnings: ${testResults.summary.warnings}`);
  console.log(`Screenshots: ${testResults.screenshots.length}`);
  console.log(`Errors: ${testResults.errors.length}`);
  console.log('='.repeat(80));

  // Add browser info
  testResults.browser = {
    name: 'Chromium',
    version: 'Latest Playwright',
    headless: true
  };

  // Add environment info
  testResults.environment = {
    node: process.version,
    playwright: require('playwright/package.json').version,
    platform: process.platform
  };

  // Calculate pass rate
  testResults.summary.passRate = testResults.summary.total > 0
    ? ((testResults.summary.passed / testResults.summary.total) * 100).toFixed(2) + '%'
    : '0%';

  // Save report
  fs.writeFileSync(REPORT_PATH, JSON.stringify(testResults, null, 2));
  console.log(`\nReport saved to: ${REPORT_PATH}`);
  console.log(`Screenshots saved to: ${SCREENSHOT_DIR}\n`);

  // Exit with error code if tests failed
  if (testResults.summary.failed > 0) {
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('FATAL ERROR:', error);
  process.exit(1);
});
