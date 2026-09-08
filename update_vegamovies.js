const fs = require('fs');
let code = fs.readFileSync('src/vegamovies/index.ts', 'utf8');
code = code.replace(
  `const seasonHit = searchData.hits.find((h: any) => {
            const t = h.document.post_title.toLowerCase();
            return t.includes(targetSeason) || t.includes(targetS) || t.match(new RegExp(\`season.*?\\\\b\${season}\\\\b\`));
        });`,
  `const tmdbTitle = title.toLowerCase().replace(/[^a-z0-9 ]/g, '');
        let seasonHit = searchData.hits.find((h: any) => {
            const t = h.document.post_title.toLowerCase();
            const cleanT = t.replace(/[^a-z0-9 ]/g, '');
            // Prioritize strict title match
            return cleanT.includes('download ' + tmdbTitle + ' ') && (t.includes(targetSeason) || t.includes(targetS) || t.match(new RegExp(\`season.*?\\\\b\${season}\\\\b\`)));
        });
        if (!seasonHit) {
            seasonHit = searchData.hits.find((h: any) => {
                const t = h.document.post_title.toLowerCase();
                return (t.includes(targetSeason) || t.includes(targetS) || t.match(new RegExp(\`season.*?\\\\b\${season}\\\\b\`)));
            });
        }`
);
fs.writeFileSync('src/vegamovies/index.ts', code);
