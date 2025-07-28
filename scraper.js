// Main entry point for Puppeteer-based YouTube ad break scraper
// Usage: node puppeteer/scraper.js

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { exportAsJSON, exportAsCSV } = require('./export');
const { sleep } = require('./utils');
const fetch = require('node-fetch');



async function scrapeVideosList(page) {
  let allVideoData = [];
  let pageNum = 1;
  let hasNextPage = true;
  let videosListUrl = '';

  // Go to videos list page
  await page.goto('https://studio.youtube.com/channel/UC/videos/upload', { waitUntil: 'networkidle2' });
  await sleep(60*1000);
  videosListUrl = page.url();

  while (hasNextPage) {
    console.log(`Scraping videos list page ${pageNum}...`);
    // Wait for thumbnails to load
    await page.waitForSelector('div#video-thumbnail a#thumbnail-anchor', { timeout: 15000 });
    const videoLinks = await page.$$eval('div#video-thumbnail a#thumbnail-anchor', els => els.map(e => e.href));
    console.log(`Found ${videoLinks.length} videos on page ${pageNum}`);

    for (let i = 0; i < videoLinks.length; i++) {
      const videoUrl = videoLinks[i];
      console.log(`Processing video ${i + 1} of ${videoLinks.length}: ${videoUrl}`);
      try {
        await page.goto(videoUrl, { waitUntil: 'networkidle2', timeout: 90000 }); // 90 seconds
        await sleep(3000);
        // Click editor tab if present
        try {
          const menuItem2 = await page.$('a#menu-item-2');
          if (menuItem2) {
            await menuItem2.click();
            await sleep(2000);
          }
        } catch (e) { console.log('Editor tab not found or click failed'); }
        // Scrape ad break data
        const videoId = extractVideoIdFromUrl(videoUrl);
        const videoData = await scrapeAdBreakDataForVideo(page, videoId, videoUrl);
        allVideoData.push(videoData);
        // Post to API after each video
        await postAdBreaksToApi(videoData);
      } catch (err) {
        console.error(`Failed to load video page: ${videoUrl} - Skipping. Error:`, err.message);
      }
      // Go back to videos list page
      try {
        await page.goto(videosListUrl, { waitUntil: 'networkidle2', timeout: 90000 });
        await sleep(2000);
      } catch (err) {
        console.error(`Failed to return to videos list page. Error:`, err.message);
      }
    }
    // Check for next page button
    const nextPageBtn = await page.$('ytcp-icon-button#navigate-after');
    if (nextPageBtn) {
      const isDisabled = await page.evaluate(btn => btn.disabled, nextPageBtn);
      if (!isDisabled) {
        await nextPageBtn.click();
        pageNum++;
        await sleep(3000);
        videosListUrl = page.url();
      } else {
        hasNextPage = false;
      }
    } else {
      hasNextPage = false;
    }
  }
  return allVideoData;
}

function extractVideoIdFromUrl(url) {
  const match = url.match(/\/video\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

async function scrapeAdBreakDataForVideo(page, videoId, videoUrl) {
  // Wait for ad breaks row or timeout
  let adBreaks = [];
  let error = '';
  try {
    await page.waitForSelector('#entrypoint-ad-breaks-row', { timeout: 5000 });
    // Click entrypoint panel if needed
    const entryPanel = await page.$('#entrypoint-ad-breaks-row ytcp-ve[role="none"]');
    if (entryPanel) {
      await entryPanel.click();
      await sleep(1000);
    }
    // Scrape ad break rows
    adBreaks = await page.$$eval('.ad-break-row.style-scope.ytve-ad-breaks-editor-options-panel', rows => rows.map((el, idx) => {
      const data = {
        index: idx + 1,
        fullText: (el.innerText || el.textContent || '').trim(),
        extractedTimes: [],
        inputs: [],
        timestamps: [],
        buttons: [],
        dataAttributes: {}
      };
      // Inputs
      const inputs = el.querySelectorAll('input, textarea, [contenteditable="true"]');
      if (inputs.length > 0) {
        data.inputs = Array.from(inputs).map(input => ({
          type: input.type || input.tagName.toLowerCase(),
          value: input.value || input.innerText || input.textContent || '',
          placeholder: input.placeholder || '',
          name: input.name || '',
          id: input.id || ''
        }));
      }
      // Timestamps
      const timeElements = el.querySelectorAll('[data-time], .time, .timestamp, [aria-label*="time"], [title*="time"]');
      if (timeElements.length > 0) {
        data.timestamps = Array.from(timeElements).map(timeEl => ({
          text: (timeEl.innerText || timeEl.textContent || '').trim(),
          ariaLabel: timeEl.getAttribute('aria-label') || '',
          title: timeEl.getAttribute('title') || '',
          dataTime: timeEl.getAttribute('data-time') || ''
        }));
      }
      // Extracted times
      const allText = data.fullText;
      const timeMatches = allText.match(/\d{1,2}:\d{2}(:\d{2})?/g);
      if (timeMatches) {
        data.extractedTimes = timeMatches;
      }
      // Buttons
      const buttons = el.querySelectorAll('button, [role="button"], label');
      if (buttons.length > 0) {
        data.buttons = Array.from(buttons).map(btn => ({
          text: (btn.innerText || btn.textContent || '').trim(),
          ariaLabel: btn.getAttribute('aria-label') || '',
          title: btn.getAttribute('title') || ''
        }));
      }
      // Data attributes
      for (const attr of el.attributes) {
        if (attr.name.startsWith('data-')) {
          data.dataAttributes[attr.name] = attr.value;
        }
      }
      return data;
    }));
  } catch (e) {
    error = 'Could not find ad break rows';
  }
  return {
    videoId,
    url: videoUrl,
    scrapedAt: new Date().toISOString(),
    error,
    adBreaks
  };
}

async function postAdBreaksToApi(videoData) {
  if (!videoData || !videoData.videoId) return;
  let adBreaksList = [];
  if (Array.isArray(videoData.adBreaks)) {
    adBreaksList = videoData.adBreaks
      .flatMap(ab => Array.isArray(ab.inputs) ? ab.inputs.map(input => input.value) : [])
      .filter(Boolean);
  }
  const payload = {
    videoId: videoData.videoId,
    adBreaksList: adBreaksList
  };
  try {
    const res = await fetch('https://projectmct.dev/api/adbreaks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    console.log('Ad breaks sent to API:', payload, 'API response:', data);
  } catch (err) {
    console.error('Failed to send ad breaks to API:', err, payload);
  }
}


(async () => {
  // Helper: auto-accept dialogs (alerts, beforeunload, etc.)
  function autoAcceptDialogs(page) {
    page.on('dialog', async dialog => {
      try {
        await dialog.accept();
        console.log('Dialog automatically accepted:', dialog.message());
      } catch (e) {
        console.log('Failed to accept dialog:', e.message);
      }
    });
  }

  // Launch browser and open YouTube Studio for manual login
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: puppeteer.executablePath()
    // No userDataDir: start with a fresh session for manual login
  });
  const page = await browser.newPage();
  autoAcceptDialogs(page);
  const allVideoData = await scrapeVideosList(page);

  // Export results
  const result = {
    totalVideos: allVideoData.length,
    processedAt: new Date().toISOString(),
    videos: allVideoData
  };
  exportAsJSON(result, path.join(__dirname, 'youtube-ad-breaks.json'));
  exportAsCSV(result, path.join(__dirname, 'youtube-ad-breaks.csv'));

  await browser.close();
  console.log('Scraping complete. Results exported.');
})();
