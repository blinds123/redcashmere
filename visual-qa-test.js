const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://redcashmere.netlify.app';
const OUTPUT_FOLDER = '/Users/nelsonchan/Downloads/red cashmere final';

async function runVisualQA() {
  const results = {
    status: 'pass',
    screenshots_taken: [],
    issues_found: [],
    test_results: {
      desktop: {},
      mobile: {},
      visual_checks: {}
    },
    timestamp: new Date().toISOString()
  };

  const browser = await chromium.launch({ headless: true });

  try {
    // Create output directories
    const desktopDir = path.join(OUTPUT_FOLDER, 'output/tests/screenshots/desktop');
    const mobileDir = path.join(OUTPUT_FOLDER, 'output/tests/screenshots/mobile');

    fs.mkdirSync(desktopDir, { recursive: true });
    fs.mkdirSync(mobileDir, { recursive: true });

    console.log('Starting Visual QA Tests...');
    console.log('Site URL:', SITE_URL);

    // ============================================
    // DESKTOP TESTS (1920x1080)
    // ============================================
    console.log('\n=== Desktop Tests (1920x1080) ===');
    const desktopContext = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    const desktopPage = await desktopContext.newPage();

    // Navigate to site
    await desktopPage.goto(SITE_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await desktopPage.waitForTimeout(3000); // Wait for animations/lazy loading

    // Desktop Screenshot 1: Full page
    const desktopFullPath = path.join(desktopDir, 'full-page.png');
    await desktopPage.screenshot({
      path: desktopFullPath,
      fullPage: true
    });
    results.screenshots_taken.push(desktopFullPath);
    console.log('✓ Desktop full page screenshot saved');

    // Desktop Screenshot 2: Above the fold
    const desktopHeroPath = path.join(desktopDir, 'above-fold.png');
    await desktopPage.screenshot({
      path: desktopHeroPath,
      clip: { x: 0, y: 0, width: 1920, height: 1080 }
    });
    results.screenshots_taken.push(desktopHeroPath);
    console.log('✓ Desktop above-the-fold screenshot saved');

    // Desktop Screenshot 3: Footer
    await desktopPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await desktopPage.waitForTimeout(1000);
    const desktopFooterPath = path.join(desktopDir, 'footer.png');
    const footerElement = await desktopPage.$('footer');
    if (footerElement) {
      await footerElement.screenshot({ path: desktopFooterPath });
      results.screenshots_taken.push(desktopFooterPath);
      console.log('✓ Desktop footer screenshot saved');
    } else {
      results.issues_found.push('Footer element not found on desktop');
      results.status = 'fail';
    }

    // Desktop Visual Checks
    results.test_results.desktop = await performVisualChecks(desktopPage, 'desktop');

    await desktopContext.close();

    // ============================================
    // MOBILE TESTS (390x844 - iPhone 14)
    // ============================================
    console.log('\n=== Mobile Tests (390x844 - iPhone 14) ===');
    const iPhone14 = devices['iPhone 14'];
    const mobileContext = await browser.newContext({
      ...iPhone14,
      viewport: { width: 390, height: 844 }
    });
    const mobilePage = await mobileContext.newPage();

    // Navigate to site
    await mobilePage.goto(SITE_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await mobilePage.waitForTimeout(3000);

    // Mobile Screenshot 1: Full page
    const mobileFullPath = path.join(mobileDir, 'full-page.png');
    await mobilePage.screenshot({
      path: mobileFullPath,
      fullPage: true
    });
    results.screenshots_taken.push(mobileFullPath);
    console.log('✓ Mobile full page screenshot saved');

    // Mobile Screenshot 2: Above the fold
    const mobileHeroPath = path.join(mobileDir, 'above-fold.png');
    await mobilePage.screenshot({
      path: mobileHeroPath,
      clip: { x: 0, y: 0, width: 390, height: 844 }
    });
    results.screenshots_taken.push(mobileHeroPath);
    console.log('✓ Mobile above-the-fold screenshot saved');

    // Mobile Screenshot 3: Scrolled to testimonials
    const testimonialsSection = await mobilePage.$('[class*="testimonial"], #testimonials, section:has(h2:text("testimonial"))');
    if (testimonialsSection) {
      await testimonialsSection.scrollIntoViewIfNeeded();
      await mobilePage.waitForTimeout(1000);
      const mobileTestimonialsPath = path.join(mobileDir, 'testimonials-section.png');
      await mobilePage.screenshot({ path: mobileTestimonialsPath });
      results.screenshots_taken.push(mobileTestimonialsPath);
      console.log('✓ Mobile testimonials screenshot saved');
    } else {
      console.log('⚠ Testimonials section not found, taking mid-page screenshot instead');
      await mobilePage.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
      await mobilePage.waitForTimeout(1000);
      const mobileMidPath = path.join(mobileDir, 'mid-page.png');
      await mobilePage.screenshot({ path: mobileMidPath });
      results.screenshots_taken.push(mobileMidPath);
    }

    // Mobile Visual Checks
    results.test_results.mobile = await performVisualChecks(mobilePage, 'mobile');

    await mobileContext.close();

    // ============================================
    // AGGREGATE RESULTS
    // ============================================
    console.log('\n=== Test Summary ===');
    console.log(`Screenshots taken: ${results.screenshots_taken.length}`);
    console.log(`Issues found: ${results.issues_found.length}`);

    if (results.issues_found.length > 0) {
      results.status = 'fail';
      console.log('\n⚠️ Issues detected:');
      results.issues_found.forEach(issue => console.log(`  - ${issue}`));
    } else {
      console.log('\n✓ All visual checks passed!');
    }

  } catch (error) {
    results.status = 'fail';
    results.issues_found.push(`Test execution error: ${error.message}`);
    console.error('Error during visual QA:', error);
  } finally {
    await browser.close();
  }

  // Save results
  const outputJsonPath = path.join(OUTPUT_FOLDER, 'output/agents/visual-qa.json');
  fs.mkdirSync(path.dirname(outputJsonPath), { recursive: true });
  fs.writeFileSync(outputJsonPath, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to: ${outputJsonPath}`);

  return results;
}

async function performVisualChecks(page, deviceType) {
  const checks = {
    broken_images: [],
    text_overflow: false,
    horizontal_scroll: false,
    images_properly_sized: true,
    cta_buttons_visible: true,
    details: {}
  };

  console.log(`\nPerforming visual checks for ${deviceType}...`);

  // Check 1: Broken images
  const images = await page.$$('img');
  console.log(`  Checking ${images.length} images...`);

  for (const img of images) {
    const src = await img.getAttribute('src');
    const naturalWidth = await img.evaluate(el => el.naturalWidth);
    const isVisible = await img.isVisible();

    if (isVisible && naturalWidth === 0) {
      checks.broken_images.push(src || 'unknown source');
    }
  }

  if (checks.broken_images.length > 0) {
    console.log(`  ✗ Found ${checks.broken_images.length} broken images`);
  } else {
    console.log(`  ✓ All images loaded successfully`);
  }

  // Check 2: Horizontal scrolling
  const hasHorizontalScroll = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  checks.horizontal_scroll = hasHorizontalScroll;

  if (hasHorizontalScroll) {
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    console.log(`  ✗ Horizontal scroll detected (${scrollWidth}px content in ${clientWidth}px viewport)`);
  } else {
    console.log(`  ✓ No horizontal scroll`);
  }

  // Check 3: Text overflow
  const overflowElements = await page.$$('[style*="overflow"]');
  const hasTextOverflow = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('*'));
    return elements.some(el => {
      const style = window.getComputedStyle(el);
      return el.scrollWidth > el.clientWidth && style.overflow === 'visible';
    });
  });
  checks.text_overflow = hasTextOverflow;

  if (hasTextOverflow) {
    console.log(`  ✗ Text overflow detected`);
  } else {
    console.log(`  ✓ No text overflow`);
  }

  // Check 4: CTA buttons visible
  const ctaSelectors = [
    'button:has-text("Order Now")',
    'button:has-text("Pre-Order")',
    'button:has-text("Buy")',
    'a:has-text("Order Now")',
    'a:has-text("Pre-Order")',
    '.cta-button',
    '.order-button'
  ];

  let ctaFound = false;
  for (const selector of ctaSelectors) {
    const cta = await page.$(selector);
    if (cta && await cta.isVisible()) {
      ctaFound = true;
      const text = await cta.textContent();
      console.log(`  ✓ CTA button visible: "${text.trim()}"`);
      break;
    }
  }

  if (!ctaFound) {
    checks.cta_buttons_visible = false;
    console.log(`  ✗ No visible CTA buttons found`);
  }

  // Check 5: Image sizing
  const oversizedImages = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img'));
    return imgs.filter(img => {
      const rect = img.getBoundingClientRect();
      return rect.width > window.innerWidth || rect.height > window.innerHeight * 2;
    }).length;
  });

  if (oversizedImages > 0) {
    checks.images_properly_sized = false;
    console.log(`  ✗ Found ${oversizedImages} oversized images`);
  } else {
    console.log(`  ✓ All images properly sized`);
  }

  // Additional details
  checks.details = {
    viewport: await page.viewportSize(),
    total_images: images.length,
    page_height: await page.evaluate(() => document.body.scrollHeight),
    page_width: await page.evaluate(() => document.body.scrollWidth)
  };

  return checks;
}

// Run the test
runVisualQA().then(results => {
  console.log('\n=== Visual QA Complete ===');
  process.exit(results.status === 'pass' ? 0 : 1);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
