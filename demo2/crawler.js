
const puppeteer = require('puppeteer');

(async () => {
    // FIXME : I should open SANDBOX, this cmdline is wrong !!!
    const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    await page.goto('http://localhost/foo.html', {
        waitUntil: 'networkidle0'
    });

    //count 
    let eleCount = await page.evaluate((sel) => {
        return document.getElementsByClassName(sel).length;
    }, 'category');


    if(eleCount != 0){
      let htmlArray = await page.evaluate((sel, eleCount) => {
            let element = document.querySelectorAll(sel);
            let htmlArray = [];
            for(let i = 0; i <= eleCount; i++){
                htmlArray[i] = element[i].innerText;
            }
            htmlArray.shift();
            return htmlArray;
        }, 'p', eleCount);
      console.log(htmlArray);
    }


    await browser.close();
})();