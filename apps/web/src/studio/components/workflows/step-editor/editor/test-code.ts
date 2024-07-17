export const TEST_CODE = `const express = require('express');

function setCorsHeaders(req, res, next) {
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  next();
}

const app = express();

app.use(setCorsHeaders);

app.get('/', (req, res) => {
res.send('Hello World!');
});

app.listen(3000, '0.0.0.0', () => {
console.log('Server is running on port 3000');
});`;
