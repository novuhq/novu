export const packageJson = `{
  "name": "example-app",
  "type": "module",
  "scripts": {
    "create:tunnel": "tsx tunnel.service.ts",
    "start": "PORT=4000 tsx watch ./workflows.ts"
  },
  "dependencies": {
    "@novu/framework": "2.0.0-canary.4",
    "@novu/ntfr-client": "^0.0.4",
    "@react-email/components": "^0.0.22",
    "h3": "^1.12.0",
    "listhen": "^1.7.2",
    "react": "^18.1.0",
    "react-email": "^2.1.6",
    "ws": "^8.11.0",
    "zod": "^3.23.8",
    "zod-to-json-schema": "^3.23.2"
  },
  "devDependencies": {
    "@types/node": "^22.1.0",
    "@types/react": "^18.3.3",
    "tsx": "^4.16.2"
  }
}`;
