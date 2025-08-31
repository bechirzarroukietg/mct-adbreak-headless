# Knowledge Guide: Creating a Puppeteer Scraper

## Overview
Puppeteer is a Node.js library that provides a high-level API to control Chrome or Chromium over the DevTools Protocol. It is commonly used for web scraping, automated testing, and browser automation.

## Prerequisites
- Node.js installed
- Basic knowledge of JavaScript

## Steps to Create a Puppeteer Scraper

### 1. Initialize Your Project
```bash
npm init -y
npm install puppeteer
```

### 2. Create a Scraper Script
Create a file, e.g., `scraper.js`.

### 3. Import Puppeteer and Launch Browser
```js
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  // ...scraping logic...
  await browser.close();
})();
```

### 4. Navigate to Target Page
```js
await page.goto('https://example.com');
```

### 5. Extract Data
Use Puppeteer's page methods to select and extract data:
```js
const data = await page.evaluate(() => {
  // Example: extract all headings
  return Array.from(document.querySelectorAll('h1')).map(h => h.textContent);
});
console.log(data);
```

### 6. Handle Pagination or Dynamic Content
You can interact with page elements, click buttons, or wait for selectors:
```js
await page.click('#next-page');
await page.waitForSelector('.results');
```

### 7. Save or Process Data
Write results to a file or process as needed:
```js
const fs = require('fs');
fs.writeFileSync('output.json', JSON.stringify(data, null, 2));
```

## Tips
- Use `waitForSelector` to ensure elements are loaded.
- Use headless mode for faster scraping: `puppeteer.launch({ headless: true })`.
- Respect website terms of service and robots.txt.
- Add delays if scraping large amounts of data to avoid being blocked.

## Resources
- [Puppeteer Documentation](https://pptr.dev/)
- [Node.js Documentation](https://nodejs.org/en/docs/)

---
This guide provides a general approach for creating a Puppeteer scraper. Adapt the logic to fit your specific use case and target website.
