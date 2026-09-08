const fs = require('fs');
let code = fs.readFileSync('src/vegamovies/index.ts', 'utf8');
code = code.replace(
  `const isBatchCheck = $(pEl).find('a, button').text().toLowerCase().includes('batch');
         console.log("Found p under", headerText.substring(0, 30), "with a href:", $(pEl).find('a[href*="vcloud"]').attr('href'), "isBatch", isBatchCheck);`,
  `const vcloudLinkDebug = $(pEl).find('a[href*="nexdrive.fit"], a[href*="vcloud.fit"], a[href*="fastdl.zip"]').attr('href');
         console.log("Found p under", headerText.substring(0, 30), "vcloudLink:", vcloudLinkDebug, "isBatch", $(pEl).find('a, button').text().toLowerCase().includes('batch'));`
);
fs.writeFileSync('src/vegamovies/index.ts', code);
