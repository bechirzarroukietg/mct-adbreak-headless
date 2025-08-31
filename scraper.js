

const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteerExtra.use(StealthPlugin());
const fs = require('fs');
const { exportAsJSON, exportAsCSV } = require('./export');
const { sleep } = require('./utils');

function extractVideoIdFromUrl(url) {
  const match = url.match(/\/video\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

async function scrapeVideosList(page, channelId) {
  let allVideoData = [];
  let pageNum = 1;
  let hasNextPage = true;
  let videosListUrl = `https://studio.youtube.com/channel/${channelId}/videos/upload`;

  await page.goto(videosListUrl, { waitUntil: 'networkidle2' });
  await sleep(10000); // Wait for page to load

  let pageTimes = [];
  let videoTimes = [];
  let totalVideos = 0;
  let processedVideoIds = new Set();
  while (hasNextPage) {
    const pageStart = Date.now();
    console.log(`Scraping videos list page ${pageNum} for channel ${channelId}...`);
    await page.waitForSelector('div#video-thumbnail a#thumbnail-anchor', { timeout: 15000 });
    const videoLinks = await page.$$eval('div#video-thumbnail a#thumbnail-anchor', els => els.map(e => e.href));
    console.log(`Found ${videoLinks.length} videos on page ${pageNum}`);

    // Process multiple video pages in parallel
    const concurrency = 5; // Number of pages to process at once
    let index = 0;
    async function processBatch(batch) {
      return await Promise.all(batch.map(async (videoUrl, i) => {
        const videoStart = Date.now();
        const videoId = extractVideoIdFromUrl(videoUrl);
        if (processedVideoIds.has(videoId)) {
          console.log(`⚠️  Duplicate video detected: ${videoId} - Already processed, skipping.`);
          return null;
        }
        processedVideoIds.add(videoId);
        console.log(`Processing video ${index + i + 1} of ${videoLinks.length}: ${videoUrl}`);
        let videoData = null;
        try {
          // Open a new browser page for each video
          const videoPage = await page.browser().newPage();
          await videoPage.goto(videoUrl, { waitUntil: 'networkidle2', timeout: 90000 });
          await sleep(3000);
          try {
            const menuItem2 = await videoPage.$('a#menu-item-2');
            if (menuItem2) {
              await menuItem2.click();
              await sleep(2000);
            }
          } catch (e) { console.log('Editor tab not found or click failed'); }
          // Take screenshot right before scraping ad breaks
          await videoPage.screenshot({ path: `screenshot-${videoId}.png` });
          videoData = await scrapeAdBreakDataForVideo(videoPage, videoId, videoUrl);
          await postAdBreaksToApi(videoData);
          await videoPage.close();
        } catch (err) {
          console.error(`Failed to load video page: ${videoUrl} - Skipping. Error:`, err.message);
        }
        videoTimes.push(Date.now() - videoStart);
        totalVideos++;
        return videoData;
      }));
    }

    while (index < videoLinks.length) {
      const batch = videoLinks.slice(index, index + concurrency);
      const batchResults = await processBatch(batch);
      allVideoData.push(...batchResults.filter(Boolean));
      index += concurrency;
    }
    pageTimes.push(Date.now() - pageStart);
    if (videoLinks.length < 30) {
      hasNextPage = false;
      console.log(`Last page detected: only ${videoLinks.length} videos found (less than 30)`);
    } else {
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
  }
  return {
    allVideoData,
    pageTimes,
    videoTimes,
    totalVideos
  };
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

async function scrapeChannel(channelId, cookies) {
  const browser = await puppeteerExtra.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  autoAcceptDialogs(page);
  // Set cookies for this channel
  for (const cookie of cookies) {
    const allowed = ['name', 'value', 'domain', 'path', 'expires', 'httpOnly', 'secure', 'sameSite'];
    const filteredCookie = Object.fromEntries(Object.entries(cookie).filter(([key]) => allowed.includes(key)));
    await page.setCookie(filteredCookie);
  }
  await page.reload({ waitUntil: 'networkidle2' });
  let timingResult = await scrapeVideosList(page, channelId);
  let allVideoData = timingResult.allVideoData;
  const result = {
    channelId,
    totalVideos: allVideoData.length,
    processedAt: new Date().toISOString(),
    videos: allVideoData
  };
  await browser.close();
  return result;
}

(async () => {
  try {
    // Read channel ID from videosListUrl.txt
    const urlContent = fs.readFileSync('videosListUrl.txt', 'utf-8').trim();
    const channelIdMatch = urlContent.match(/\/channel\/([^\/]+)/);
    if (!channelIdMatch) {
      throw new Error('Could not extract channel ID from videosListUrl.txt');
    }
    const channelId = channelIdMatch[1];
    
    // Read cookies from cookies.json
    const cookies = JSON.parse(fs.readFileSync('cookies.json', 'utf-8'));
    
    console.log(`Starting scrape for channel: ${channelId}`);
    const result = await scrapeChannel(channelId, cookies);
    
    // Export results
    await exportAsJSON(result, `scrape-results-${channelId}-${Date.now()}.json`);
    console.log(`Scraping completed. Total videos: ${result.totalVideos}`);
  } catch (error) {
    console.error('Scraping failed:', error.message);
  }
})();
