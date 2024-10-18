// server.js
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const { chromium } = require('playwright');
app.use(express.json());
//heroku
async function fetchFarmingPageHtml(zipCode, ingredient) {
  let browser = null;
  let farmnlink = [];

  try {
    console.log('Launching browser...');
    browser = await chromium.launch({
      headless: false,
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('Navigating to LocalHarvest...');
    await page.goto('https://www.localharvest.org/', { 
      waitUntil: 'networkidle'
    });

    console.log('Waiting for search fields...');
    await Promise.all([
      page.waitForSelector('#search-dropdown', { state: 'visible', timeout: 30000 }),
      page.waitForSelector("#search-text", { state: 'visible', timeout: 30000 }),
      page.waitForSelector('#search-near', { state: 'visible', timeout: 30000 })
    ]);

    console.log('Filling search fields...');
    await page.click('#search-dropdown');
    await page.waitForSelector('#navmenupalette', { state: 'visible', timeout: 10000 });
    await page.click('a.search-panel-cat[data-cat="0"]');
    await page.fill("#search-text", ingredient);
    await page.fill('#search-near', zipCode);

    console.log('Submitting search...');
    await page.click('#search-form > span.searchglasswrap > span');

    console.log('Waiting for results...');
    await page.waitForTimeout(5000);

    const noFarmsFound = await page.$('.alert.negative');
    if (noFarmsFound) {
      console.log('No farms found');
      return "No farms found near you";
    }

    console.log('Processing results...');
    await page.waitForSelector('.memberentriesblock .entry_title a, .memberentriesblock .membercell a', { 
      state: 'visible', 
      timeout: 60000 
    });

    const farmTitle = await page.$eval(
      '.memberentriesblock .entry_title a, .memberentriesblock .membercell a', 
      (element) => element.textContent.trim()
    );
    console.log('Farm title:', farmTitle);
    farmnlink.push(farmTitle);

    await page.click('.membercell h4.inline a');
    const newPageUrl = page.url();
    console.log('Farm page URL:', newPageUrl);
    farmnlink.push(newPageUrl);

    return farmnlink;
  } catch (error) {
    console.error("An error occurred while fetching the farming page HTML:", error);
    if (error.name === 'TimeoutError') {
      return "Timeout: The page took too long to respond. Please try again later.";
    }
    return `An error occurred while fetching data: ${error.message}`;
  } finally {
    if (browser) {
      console.log('Closing browser...');
      await browser.close();
    }
  }
}

// Sample route to check the server is working
app.get('/FindFarmer', (req, res) => {
  res.send('Server is running');
  const { zipCode, ingredient } = req.query;
  const farmnlink = fetchFarmingPageHtml(zipCode, ingredient);
  res.json({ farmnlink });
});



// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
