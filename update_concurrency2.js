const fs = require('fs');

let code = fs.readFileSync('src/vegamovies/index.ts', 'utf8');

code = code.replace(
  `for (const stream of streams) {`,
  `await Promise.all(streams.map(async (stream) => {`
);

code = code.replace(
  `      } catch(e) {
        console.error("V-Cloud Resolve Error", e);
      }
    }
    
    // Sort`,
  `      } catch(e) {
        console.error("V-Cloud Resolve Error", e);
      }
    }));
    
    // Sort`
);


// Bump root manifest
let manifest = fs.readFileSync('manifest.json', 'utf8');
manifest = manifest.replace(
  `"version": "1.0.7",\n  "scrapers":`,
  `"version": "1.0.8",\n  "scrapers":`
);
manifest = manifest.replace(
  `"id": "vegamovies",
      "name": "Vegamovies",
      "description": "High quality 1080p/4K direct links via ScraperAPI (Bypasses Cloudflare Turnstile automatically).",
      "version": "1.0.7",`,
  `"id": "vegamovies",
      "name": "Vegamovies",
      "description": "High quality 1080p/4K direct links via ScraperAPI. (Optimized concurrent extraction for faster load times).",
      "version": "1.0.8",`
);

fs.writeFileSync('src/vegamovies/index.ts', code);
fs.writeFileSync('manifest.json', manifest);
