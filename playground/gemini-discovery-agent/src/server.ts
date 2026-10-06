import { serve } from '@novu/framework/express';
import express from 'express';
import { discoveryAgent } from './agent.ts';
import { agents, config } from './config.ts';
import { log } from './log.ts';

const novuApiUrl = process.env.NOVU_API_URL;
if (novuApiUrl) {
  // Novu hands out its public URL (a tunnel in local dev) for agent events and replies; send them to NOVU_API_URL.
  const baseFetch = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    const url = input instanceof Request ? undefined : new URL(input);

    return baseFetch(url?.pathname.startsWith('/v1/agents/') ? new URL(url.pathname + url.search, novuApiUrl) : input, init);
  };
}

const app = express();
app.use(express.json({ limit: '5mb' }));
// Novu gets an immediate ack; the turn keeps running in this process.
app.use('/api/novu', serve({ agents: [discoveryAgent] }));

app.listen(config.port, () => log('server_started', { port: config.port, agents: agents.map((agent) => agent.id) }));
