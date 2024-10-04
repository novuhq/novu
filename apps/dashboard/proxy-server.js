import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { legacyHandler } from './legacy-handler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const port = process.env.PORT || 8080;
const app = express();

// Proxy requests with /api to another server (e.g., API backend)
app.use(
  '/api',
  createProxyMiddleware({
    target: `http://127.0.0.1:${port}?`, // Backend server
    changeOrigin: true, // Modify the origin header to match the target
  })
);

// Serve static files for the front-end app
app.use(express.static('dist'));

app.get('/legacy/*', (req, res, next) => {
  legacyHandler(__dirname, req, res, next);
});

// Fallback for any other request to index.html (useful for Single Page Applications)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/index.html'));
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
