const fs = require('fs');
let code = fs.readFileSync('src/vegamovies/index.ts', 'utf8');
code = code.replace(
  `// 3. Fetch Post HTML`,
  `console.log("Fetching URL:", postUrl); // 3. Fetch Post HTML`
);
fs.writeFileSync('src/vegamovies/index.ts', code);
