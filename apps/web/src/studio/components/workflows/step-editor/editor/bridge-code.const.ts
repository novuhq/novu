export const BRIDGE_CODE = `
import express from 'express';
import http from 'http';
import { Client } from '@novu/framework';
import { serve } from '@novu/framework/express';

let server: express.Express;
let app: http.Server;
let client = new Client({ strictAuthentication: false });

const newWorkflow = workflow('hello-world', async ({ step, payload }) => {
  await step.email(
    'send-email',
    async (controls) => {
      return {
        subject: 'This is an email subject ' + controls.name,
        body: 'Body result ' + payload.name,
      };
    },
    {
      controlSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', default: 'TEST' },
        },
      } as const,
    }
  );
});

function setCorsHeaders(req, res, next) {
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  next(); 
}

server = express();

server.use(setCorsHeaders);
server.use(express.json());
server.use(serve({ client: client, workflows: [newWorkflow] }));

app = server.listen(9999);
`;
