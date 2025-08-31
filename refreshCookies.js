const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteerExtra.use(StealthPlugin());
const fs = require('fs');

async function refreshCookies() {
  console.log('Starting cookie refresh process...');
  
  const browser = await puppeteerExtra.launch({
    headless: false, // Show browser for manual login
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
    // Load existing cookies if they exist
    try {
      const existingCookies = JSON.parse(fs.readFileSync('cookies.json', 'utf-8'));
      for (const cookie of existingCookies) {
        const allowed = ['name', 'value', 'domain', 'path', 'expires', 'httpOnly', 'secure', 'sameSite'];
        const filteredCookie = Object.fromEntries(Object.entries(cookie).filter(([key]) => allowed.includes(key)));
        await page.setCookie(filteredCookie);
      }
      console.log('Loaded existing cookies');
    } catch (err) {
      console.log('No existing cookies found, starting fresh');
    }

    // Navigate to YouTube Studio
    console.log('Navigating to YouTube Studio...');
    await page.goto('https://studio.youtube.com/', { waitUntil: 'networkidle2' });
    
    console.log('\n=== MANUAL ACTION REQUIRED ===');
    console.log('1. Please complete the login process in the browser window');
    console.log('2. Navigate to your channel videos page');
    console.log('3. Press ENTER in this terminal when ready to save cookies');
    console.log('================================\n');
    
    // Wait for user input
    await new Promise(resolve => {
      process.stdin.once('data', () => {
        resolve();
      });
    });
    
    // Get all cookies from the current session
    const cookies = await page.cookies();
    
    // Save cookies to file
    fs.writeFileSync('cookies.json', JSON.stringify(cookies, null, 2), 'utf-8');
    
    console.log(`✅ Successfully saved ${cookies.length} cookies to cookies.json`);
    console.log('Cookie refresh completed!');
    
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
