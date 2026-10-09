import puppeteer from 'puppeteer';

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('BROWSER_LOG:', msg.text()));
    page.on('pageerror', error => console.log('BROWSER_ERROR:', error.message));
    
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 10000 });
    
    const content = await page.content();
    if (content.includes('<div id="root"></div>') && content.length < 500) {
      console.log('App is rendering empty root div.');
    } else {
      console.log('App rendered successfully.');
    }
    
    await browser.close();
  } catch (err) {
    console.error('Puppeteer error:', err.message);
  }
})();
