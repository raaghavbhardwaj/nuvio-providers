const fs = require('fs');
let code = fs.readFileSync('src/vegamovies/index.ts', 'utf8');
code = code.replace(
  "const decoded = Buffer.from(Buffer.from(atobMatch[1], 'base64').toString('utf8'), 'base64').toString('utf8');",
  "const decoded = atob(atob(atobMatch[1]));"
);
fs.writeFileSync('src/vegamovies/index.ts', code);
