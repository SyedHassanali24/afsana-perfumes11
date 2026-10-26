import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { connectDB } = require('./database/connection.js');

async function createServer() {
  await connectDB();

  const app = express();
  const PORT = 3000;
  const HOST = '0.0.0.0';

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  const handlers = new Map();

  function getHandler(group) {
    if (handlers.has(group)) return handlers.get(group);
    const fnPath = path.join(__dirname, 'netlify', 'functions', group, 'index.js');
    if (!fs.existsSync(fnPath)) return null;
    try {
      const mod = require(fnPath);
      handlers.set(group, mod.handler);
      return mod.handler;
    } catch (err) {
      console.error(`Failed to load function ${group}:`, err);
      return null;
    }
  }

  // API middleware: matches all /api/* requests
  app.use('/api', async (req, res, next) => {
    const parsedUrl = req.url.split('?')[0];
    const match = parsedUrl.match(/^\/([^/?]+)(.*)/);
    if (!match) return next();

    const group = match[1];
    const handler = getHandler(group);

    if (!handler) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `API route /api/${group} not found.` } });
    }

    try {
      const fullPath = req.originalUrl.split('?')[0];
      const hasBody = req.method !== 'GET' && req.method !== 'HEAD' && req.body && Object.keys(req.body).length > 0;
      const event = {
        httpMethod: req.method,
        path: fullPath,
        headers: {
          ...req.headers,
          'x-requested-with': req.headers['x-requested-with'] || 'afsana',
        },
        queryStringParameters: req.query,
        body: hasBody ? (typeof req.body === 'string' ? req.body : JSON.stringify(req.body)) : undefined,
        isBase64Encoded: false,
      };

      const result = await handler(event);

      res.status(result.statusCode || 200);
      if (result.headers) {
        for (const [k, v] of Object.entries(result.headers)) {
          if (k.toLowerCase() === 'set-cookie') {
            res.setHeader('Set-Cookie', v);
          } else {
            res.setHeader(k, v);
          }
        }
      }
      res.send(result.body);
    } catch (err) {
      console.error(`[API Error /api/${group}]:`, err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message || 'Internal server error' } });
    }
  });

  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`[Afsana Perfumes] Server running at http://${HOST}:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('[Afsana Perfumes] Fatal server startup error:', err);
  process.exit(1);
});
