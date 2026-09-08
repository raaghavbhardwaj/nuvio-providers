const fs = require('fs');
let code = fs.readFileSync('src/vegamovies/index.ts', 'utf8');
code = code.replace(
  `const epText = nex$(epEl).text().toLowerCase();
                    console.log("epText:", epText);`,
  `const epText = nex$(epEl).text().toLowerCase();`
);
fs.writeFileSync('src/vegamovies/index.ts', code);
