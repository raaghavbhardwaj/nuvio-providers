const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  `import proxyHandler from './api/proxy';`,
  `import proxyHandler from './api/proxy';\nimport vidsrcHandler from './api/vidsrc';`
);

const vidsrcRoute = `  if (urlObj.pathname === '/api/vidsrc') {
    (req as any).query = Object.fromEntries(urlObj.searchParams.entries());
    (res as any).status = (code: number) => {
      res.statusCode = code;
      return res;
    };
    (res as any).json = (data: any) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
      return res;
    };
    (res as any).send = (data: any) => {
      res.end(data);
      return res;
    };
    return vidsrcHandler(req as any, res as any);
  }

  if (urlObj.pathname === '/api/proxy') {`;

code = code.replace(`  if (urlObj.pathname === '/api/proxy') {`, vidsrcRoute);

fs.writeFileSync('server.ts', code);
