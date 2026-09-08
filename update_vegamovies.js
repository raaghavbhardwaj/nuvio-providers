const fs = require('fs');
let code = fs.readFileSync('src/vegamovies/index.ts', 'utf8');

code = code.replace(
  `name: 'VegaMovies Direct',`,
  `server: 'VegaMovies Direct',\n                title: stream.size ? \`\${stream.quality} - \${stream.size}\` : \`VegaMovies \${stream.quality}\`,`
);
fs.writeFileSync('src/vegamovies/index.ts', code);
