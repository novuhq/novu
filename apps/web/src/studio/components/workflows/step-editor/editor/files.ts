import { BRIDGE_CODE } from './bridge-code.const';

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
    "dev": "novu dev",
    "test": "curl  http://localhost:3111",
    "start": "nodemon --watch './' index.js"
  }
}`,
    },
  },
};
