export const TEST_CODE = `const express = require('express');
const app = express();

app.get('/', (req, res) => {
res.send('Hello World!');
});

app.listen(3000, '0.0.0.0', () => {
console.log('Server is running on port 3000');
});`;

export const webContainerExampleCode = `
import express from 'express';

console.log('Starting app');

const app = express();
const port = 3111;

app.get('/', (req, res) => {
  res.send('Welcome to a WebContainers app! 🥳');
});

app.listen(port, () => {
  console.log(\`App is live at http://localhost:\${port}\`);
});

console.log('Finished starting app');

`;
