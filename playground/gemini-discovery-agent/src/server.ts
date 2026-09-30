import express from 'express';
import { serve } from '@novu/framework/express';
import { createDiscoveryAgent } from './agent.ts';
import { loadConfig, log } from './config.ts';

const config = loadConfig();
// The framework signs event delivery to Novu with it and verifies bridge HMAC when NODE_ENV=production.
if (!config.novuSecretKey) throw new Error('NOVU_SECRET_KEY is required');

const app = express();
app.use(express.json({ limit: '5mb' }));
// Agent events are acked immediately; the turn keeps running in this process (Cloud Run needs CPU always allocated).
app.use('/api/novu', serve({ agents: [createDiscoveryAgent(config)] }));

app.listen(config.port, () =>
  log('server_started', {
    port: config.port,
    bridgePath: '/api/novu',
    agents: config.agents.map((target) => `${target.id}:${target.path}:${target.targetId}`),
    geminiModel: config.geminiModel,
    classifierModel: config.classifierModel,
  })
);
