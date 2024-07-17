import { TEST_CODE } from './test-code';

export const files = {
  'index.js': {
    file: {
      contents: `
        import express from 'express';
        
        function setCorsHeaders(req, res, next) {
          res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
          res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
          res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
          next(); 
        }

        const app = express();
        app.use(setCorsHeaders);
        const port = 3111;
        
        app.get('/', (req, res) => {
          res.send('Welcome to a WebContainers app! 🥳');
        });
        
        app.listen(port, () => {
          console.log(\`App is live at http://localhost:\${port}\`);
        });`,
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
            "nodemon": "latest"
          },
          "scripts": {
            "start": "nodemon --watch './' index.js"
          }
        }`,
    },
  },
};
