// Export functions for JSON and CSV
const fs = require('fs');

function exportAsJSON(data, filename) {
  fs.writeFileSync(filename, JSON.stringify(data, null, 2), 'utf8');
  console.log('Exported JSON:', filename);
}

function exportAsCSV(data, filename) {
  // Simple CSV export for ad break data
  const headers = [
    'Video ID', 'Video URL', 'Scraped At', 'Error', 'Ad Break Count', 'Ad Break Index', 'Ad Break Full Text', 'Extracted Times', 'Inputs', 'Timestamps', 'Buttons', 'Data Attributes'
  ];
  const rows = [];
  rows.push(headers.join(','));
  data.videos.forEach(video => {
    if (!video.adBreaks || video.adBreaks.length === 0) {
      rows.push([
        video.videoId || '',
        video.url || '',
        video.scrapedAt || '',
        video.error || '',
        '0','','','','','','',''
      ].map(v => `"${v}"`).join(','));
    } else {
      video.adBreaks.forEach(adBreak => {
        rows.push([
          video.videoId || '',
          video.url || '',
          video.scrapedAt || '',
          video.error || '',
          video.adBreaks.length,
          adBreak.index || '',
          (adBreak.fullText || '').replace(/"/g, '""'),
          (adBreak.extractedTimes || []).join('; '),
          (adBreak.inputs || []).map(i => `${i.type}:${i.value}`).join('; '),
          (adBreak.timestamps || []).map(ts => ts.text).join('; '),
          (adBreak.buttons || []).map(btn => btn.text).join('; '),
          adBreak.dataAttributes ? Object.entries(adBreak.dataAttributes).map(([k,v]) => `${k}:${v}`).join('; ') : ''
        ].map(v => `"${v}"`).join(','));
      });
    }
  });
  fs.writeFileSync(filename, rows.join('\n'), 'utf8');
  console.log('Exported CSV:', filename);
}

module.exports = { exportAsJSON, exportAsCSV };
