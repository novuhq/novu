#!/usr/bin/env node
// The box's self-hosted Novu app: code-first workflows served the way a customer serves them, with
// `@novu/framework/express`. box.mjs links node_modules/ to the checkout's packages/framework and its
// dependencies, so the bridge always runs the framework, express and zod of the PR under test.
//
// It serves the Development environment and signs with its secret key, which the bake writes to
// SECRET_FILE. Until then (the first boot of a bake) the server waits for it.
import fs from 'node:fs';
import { Client, serve } from '@novu/framework/express';
import express from 'express';
import { workflows } from './workflows.mjs';

const PORT = Number(process.env.BRIDGE_PORT ?? 4000);
const SECRET_FILE = process.env.BRIDGE_SECRET_FILE ?? '/data/bridge/secret-key';

while (!fs.existsSync(SECRET_FILE)) await new Promise((resolve) => setTimeout(resolve, 1000));

const app = express();
app.use(express.json({ limit: '5mb' }));
app.use(
  '/api/novu',
  serve({ client: new Client({ secretKey: fs.readFileSync(SECRET_FILE, 'utf8').trim(), strictAuthentication: true }), workflows })
);
app.listen(PORT, '127.0.0.1', () => console.log(`bridge listening on 127.0.0.1:${PORT} with ${workflows.length} workflows`));
