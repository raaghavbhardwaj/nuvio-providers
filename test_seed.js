const https = require('https');
fetch("https://api.speedracelight.com/seed?mediaId=572802", {
  headers: {
    'Accept': '*/*',
    'Origin': 'https://player.videasy.to',
    'Referer': 'https://player.videasy.to/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
  }
}).then(async r => {
  console.log("Status:", r.status);
  console.log("Text:", await r.text());
}).catch(console.error);
