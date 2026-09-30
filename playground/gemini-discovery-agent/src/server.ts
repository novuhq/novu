import { serve } from '@novu/framework/express';
import express from 'express';
import { discoveryAgent } from './agent.ts';
import { agents, config } from './config.ts';
import { log } from './log.ts';

const app = express();
app.use(express.json({ limit: '5mb' }));
// Novu gets an immediate ack; the turn keeps running in this process.
app.use('/api/novu', serve({ agents: [discoveryAgent] }));

app.listen(config.port, () => log('server_started', { port: config.port, agents: agents.map((agent) => agent.id) }));
