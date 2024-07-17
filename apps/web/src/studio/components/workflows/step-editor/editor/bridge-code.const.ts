export const BRIDGE_CODE = `
import express from 'express';
import { Client, workflow } from '@novu/framework';
import { serve } from '@novu/framework/express';
let server;
let client = new Client({ strictAuthentication: false });
const newWorkflow = workflow('hello-world', async ({ step, payload }) => {
    await step.email('send-email', async (controls) => {
        return {
            subject: 'This is an email subject ' + controls.name,
            body: 'Body result ' + payload.name,
        };
    }, {
        controlSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', default: 'TEST' },
            },
        },
    });
});
server = express();
server.use(express.json());
server.use(serve({ client: client, workflows: [newWorkflow] }));
server.listen(9999);

`;
