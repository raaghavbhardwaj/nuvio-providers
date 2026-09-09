import http from 'http';
import path from 'path';
import fs from 'fs';
import cinejoyHandler from './api/cinejoy';
import proxyHandler from './api/proxy';
import vidsrcHandler from './api/vidsrc';

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (urlObj.pathname === '/api/cinejoy') {
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
    return cinejoyHandler(req as any, res as any);
  }

  if (urlObj.pathname === '/api/vidsrc') {
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

  if (urlObj.pathname === '/api/proxy') {
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
    return proxyHandler(req as any, res as any);
  }

  // Handle static files / manifest.json
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  let filePath = path.join(__dirname, urlObj.pathname === '/' ? 'manifest.json' : urlObj.pathname);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    const contentType =
      ext === '.json'
        ? 'application/json'
        : ext === '.js'
          ? 'application/javascript'
          : 'text/plain';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default server;
