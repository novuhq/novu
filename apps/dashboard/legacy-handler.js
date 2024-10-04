import fs from 'fs';
import path from 'path';

export const legacyHandler = (__dirname, req, res, next) => {
  if (req?.url?.startsWith('/legacy/') && req.headers['accept']?.includes('text/html')) {
    const legacyPath = path.resolve(__dirname, 'legacy', 'index.html');
    const fileExists = fs.existsSync(legacyPath);

    if (fileExists) {
      // Serve the legacy index.html file
      res.setHeader('Content-Type', 'text/html');
      res.statusCode = 200;
      fs.createReadStream(legacyPath).pipe(res);
      return;
    }

    res.statusCode = 404;
    res.end('Legacy index.html not found');
    return;
  }

  next();
};
