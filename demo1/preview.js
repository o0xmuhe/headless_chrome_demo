const puppeteer = require('puppeteer');



(async () => {
    targetUrl = "https://www.google.com.hk";

    try {
        const args = process.argv.slice(2)
        targetUrl = args[0];
    } catch (e) {
        console.log(e);
    }

    // FIXME : I should open SANDBOX, this cmdline is wrong !!!
    const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    await page.goto(targetUrl);
    await page.screenshot({ path: 'res.png' });

    await browser.close();
})();