// Novu Box on Cloudflare, the host Worker `novu-box-hub` (wrangler.jsonc): the Box Durable Object class (box.ts),
// one per box, each with its container; the Slack router's (slack/router.ts); and its own routes for creating and
// deleting boxes (boxes.ts). Boxes are reached through their own Workers (thin.ts), never through this one.

import { HOST } from '../shared/names.ts';
import { boxes } from './boxes.ts';
import type { HostEnv } from './env.ts';

export { Box } from './box.ts';
export { Router } from './slack/router.ts';

export default {
  fetch(request: Request, env: HostEnv): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/__box/boxes' || url.pathname.startsWith('/__box/boxes/')) return boxes(request, env, url);

    return Promise.resolve(
      new Response(`${HOST}: reach a box through its own Worker, novu-box-<box>\n`, { status: 404 })
    );
  },
} satisfies ExportedHandler<HostEnv>;
