const puppeteer = require('puppeteer');

(async () => {
  // FIXME : I should open SANDBOX, this cmdline is wrong !!!
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args:['--no-sandbox', '--disable-setuid-sandbox']});
  const page = await browser.newPage();
  await page.goto('https://www.google.com.hk/');
  await page.screenshot({ path: 'google.png' });

  await browser.close();
})();