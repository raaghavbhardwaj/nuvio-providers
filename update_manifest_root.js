const fs = require('fs');
let manifest = fs.readFileSync('manifest.json', 'utf8');
manifest = manifest.replace(
  `"version": "1.0.0",\n  "scrapers":`,
  `"version": "1.0.5",\n  "scrapers":`
);
fs.writeFileSync('manifest.json', manifest);
