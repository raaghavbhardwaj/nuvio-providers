const fs = require('fs');
let code = fs.readFileSync('src/vegamovies/index.ts', 'utf8');
code = code.replace(/module\.exports\s*=\s*\{[^}]+\};/g, '');
fs.writeFileSync('src/vegamovies/index.ts', code);

let manifest = fs.readFileSync('manifest.json', 'utf8');
manifest = manifest.replace(
  `"version": "1.0.5",\n  "scrapers":`,
  `"version": "1.0.6",\n  "scrapers":`
);
manifest = manifest.replace(
  `"id": "vegamovies",
      "name": "Vegamovies",
      "description": "High quality 1080p/4K direct links with V-Cloud and G-Direct extraction. No Cloudflare blocking.",
      "version": "1.0.5",`,
  `"id": "vegamovies",
      "name": "Vegamovies",
      "description": "High quality 1080p/4K direct links with V-Cloud and G-Direct extraction. No Cloudflare blocking.",
      "version": "1.0.6",`
);
fs.writeFileSync('manifest.json', manifest);
