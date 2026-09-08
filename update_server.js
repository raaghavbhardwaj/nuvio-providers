const fs = require('fs');
let text = fs.readFileSync('server.ts', 'utf8');
text = text.replace("import cinejoyHandler from './api/cinejoy';", "import cinejoyHandler from './api/cinejoy';\nimport proxyHandler from './api/proxy';");
text = text.replace("return cinejoyHandler(req as any, res as any);\n  }", "return cinejoyHandler(req as any, res as any);\n  }\n\n  if (urlObj.pathname === '/api/proxy') {\n    (req as any).query = Object.fromEntries(urlObj.searchParams.entries());\n    (res as any).status = (code: number) => {\n      res.statusCode = code;\n      return res;\n    };\n    (res as any).json = (data: any) => {\n      res.setHeader('Content-Type', 'application/json');\n      res.end(JSON.stringify(data));\n      return res;\n    };\n    (res as any).send = (data: any) => {\n      res.end(data);\n      return res;\n    };\n    return proxyHandler(req as any, res as any);\n  }");
fs.writeFileSync('server.ts', text);
