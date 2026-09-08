const fs = require('fs');
let code = fs.readFileSync('src/vegamovies/index.ts', 'utf8');
code = code.replace(
  `const targetS = \`s\${season.toString().padStart(2, '0')}\`;`,
  `const targetS = \`s\${Number(season) < 10 ? '0' + season : season}\`;`
);
fs.writeFileSync('src/vegamovies/index.ts', code);
