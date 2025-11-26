const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  
  await page.goto('https://redcashmere.netlify.app', { waitUntil: 'networkidle', timeout: 30000 });
  
  // Scroll to make sure all lazy images load
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2000);
  
  const brokenImages = await page.evaluate(() => {
    const images = document.querySelectorAll('img');
    const broken = [];
    images.forEach(img => {
      if (img.naturalWidth === 0) {
        broken.push({
          src: img.src,
          alt: img.alt,
          complete: img.complete,
          naturalWidth: img.naturalWidth
        });
      }
    });
    return broken;
  });
  
  console.log('Broken images:', brokenImages.length);
  brokenImages.forEach((img, i) => {
    console.log(`${i+1}. ${img.src}`);
    console.log(`   alt: ${img.alt}, complete: ${img.complete}`);
  });
  
  await browser.close();
})();
