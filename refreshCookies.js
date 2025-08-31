const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteerExtra.use(StealthPlugin());
const fs = require('fs');

async function refreshCookies() {
  console.log('Starting automatic cookie refresh process...');
  
  const browser = await puppeteerExtra.launch({
    headless: true, // Run headless for automatic refresh
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-features=VizDisplayCompositor',
      '--disable-web-security',
      '--disable-features=SameSiteByDefaultCookies,CookiesWithoutSameSiteMustBeSecure'
    ]
  });
  
  const page = await browser.newPage();
  
  // Auto-accept dialogs
  page.on('dialog', async dialog => {
    try {
      await dialog.accept();
      console.log('Dialog automatically accepted:', dialog.message());
    } catch (e) {
      console.log('Failed to accept dialog:', e.message);
    }
  });

  try {
    // Load existing cookies from cookies.json
    console.log('Loading existing cookies from cookies.json...');
    const existingCookies = JSON.parse(fs.readFileSync('cookies.json', 'utf-8'));
    
    for (const cookie of existingCookies) {
      const allowed = ['name', 'value', 'domain', 'path', 'expires', 'httpOnly', 'secure', 'sameSite'];
      const filteredCookie = Object.fromEntries(Object.entries(cookie).filter(([key]) => allowed.includes(key)));
      await page.setCookie(filteredCookie);
    }
    console.log(`Loaded ${existingCookies.length} existing cookies`);

    // Navigate to YouTube Studio
    console.log('Navigating to YouTube Studio...');
    await page.goto('https://studio.youtube.com/', { waitUntil: 'networkidle2' });
    
    // First refresh
    console.log('Performing first page refresh...');
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
    
    // Second refresh
    console.log('Performing second page refresh...');
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
    
    // Get updated cookies
    console.log('Extracting refreshed cookies...');
    const refreshedCookies = await page.cookies();
    
    // Save refreshed cookies to file
    fs.writeFileSync('cookies.json', JSON.stringify(refreshedCookies, null, 2), 'utf-8');
    
    console.log(`✅ Successfully refreshed and saved ${refreshedCookies.length} cookies to cookies.json`);
    console.log('Cookie refresh completed automatically!');
    
  } catch (error) {
    console.error('Error during cookie refresh:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the refresh function
(async () => {
  try {
    await refreshCookies();
  } catch (error) {
    console.error('Failed to refresh cookies:', error.message);
  }
})();
