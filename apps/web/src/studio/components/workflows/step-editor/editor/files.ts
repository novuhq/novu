export const dynamicFiles = (indexCode: string, reactEmail: string) => {
  return {
    'index.ts': {
      file: {
        contents: indexCode,
      },
    },
    'react-email.tsx': {
      file: {
        contents: reactEmail,
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
    "zod": "^3.23.0",
    "react-email": "^2.1.6",
    "@react-email/components": "^0.0.22",
    "react": "^18.1.0"
  },
  "devDependencies": {
    "typescript": "^4.9.5",
    "tsx": "^4.16.2"
  },
  "scripts": {
    "dev": "novu dev",
    "test": "curl  http://localhost:3111",
    "start": "tsx watch index.ts"
  }
}`,
      },
    },
    'tsconfig.json': {
      file: {
        contents: `{
          "compilerOptions": {
            "target": "ESNext",
            "jsx": "react"
          }
        }`,
      },
    },
  };
};
