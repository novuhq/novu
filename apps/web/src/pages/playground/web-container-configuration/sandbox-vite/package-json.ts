export const PACKAGE_JSON = `{
  "name": "example-app",
  "type": "module",
  "scripts": {
    "create:tunnel": "tsx tunnel.ts",
    "start": "PORT=4000 nodemon -w ./src -x tsx ./src/workflows.ts",
    "build": "vite build"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "express": "^4.19.2",
    "vite-express": "*",
    "@novu/framework": "2.0.0",
    "@react-email/components": "^0.0.22",
    "tsx": "^4.3.0",
    "typescript": "^5.3.2",
    "zod": "^3.23.8",
    "ws": "^8.11.0",
    "@novu/ntfr-client": "^0.0.4",
    "zod-to-json-schema": "^3.23.2"
  },
  "devDependencies": {
    "@types/react": "^18.0.38",
    "@types/react-dom": "^18.2.16",
    "@types/express": "^4.17.21",
    "@types/node": "^20.9.3",
    "nodemon": "^3.0.1",
    "vite": "^5.0.2"
  }
}
`;
