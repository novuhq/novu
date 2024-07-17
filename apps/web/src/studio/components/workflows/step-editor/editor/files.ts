import { TEST_CODE } from './test-code';
import { BRIDGE_CODE } from './bridge-code.const';

export const demoCode = `
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

export const files = {
  'index.js': {
    file: {
      contents: BRIDGE_CODE,
    },
  },
  'package.json': {
    file: {
      contents: `
{
  "name": "example-app",
  "type": "module",
  "dependencies": {
    "express": "latest",
    "novu": "latest",
    "@novu/framework": "latest",    
    "zod-to-json-schema": "^3.23.0",
    "nodemon": "latest"
  },
  "scripts": {
    "dev": "novu dev --port 3111",
    "test": "curl  http://localhost:3111",
    "start": "nodemon --watch './' index.js"
  }
}`,
    },
  },
};
