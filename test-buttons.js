const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  
  await page.goto('https://redcashmere.netlify.app', { waitUntil: 'networkidle', timeout: 30000 });
  
  const buttons = await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    return Array.from(btns).map(b => ({
      text: b.textContent.trim().substring(0, 60),
      className: b.className,
      onclick: b.getAttribute('onclick')
    }));
  });
  
  console.log('Buttons found:');
  buttons.forEach((b, i) => {
    console.log(`${i+1}. "${b.text}"`);
    if (b.onclick) console.log(`   onclick: ${b.onclick}`);
  });
  
  await browser.close();
})();
