import { TEST_CODE } from './test-code';

export const demoCode = `
import express from 'express';

const app = express();
const port = 3111;

app.get('/', (req, res) => {
  res.send('Welcome to a WebContainers app! 🥳');
});

app.listen(port, () => {
  console.log(\`App is live at http://localhost:\${port}\`);
});
`;

export const files = {
  'index.js': {
    file: {
      contents: demoCode,
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
