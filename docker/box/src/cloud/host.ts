import { HOST } from '../shared/names.ts';
import { boxes } from './boxes.ts';
import type { HostEnv } from './env.ts';
import { users } from './users.ts';

export { Box } from './box.ts';
export { Router } from './slack/router.ts';

export default {
  fetch(request: Request, env: HostEnv): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/__box/boxes' || url.pathname.startsWith('/__box/boxes/')) return boxes(request, env, url);
    if (url.pathname === '/__box/users' || url.pathname.startsWith('/__box/users/')) return users(request, env, url);

    return Promise.resolve(
      new Response(`${HOST}: reach a box through its own Worker, novu-box-<box>\n`, { status: 404 })
    );
  },
} satisfies ExportedHandler<HostEnv>;
