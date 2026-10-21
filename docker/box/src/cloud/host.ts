import { authorize } from '../shared/auth.ts';
import { boxOfHost, DOMAIN, HOST, SLACK_HOST } from '../shared/names.ts';
import { boxes } from './boxes.ts';
import type { HostEnv } from './env.ts';
import { text } from './life.ts';
import { testerArmy } from './testerarmy.ts';
import { users } from './users.ts';

export { Box } from './box.ts';
export { Registry } from './registry.ts';
export { Router } from './slack/router.ts';

export default {
  async fetch(request: Request, env: HostEnv): Promise<Response> {
    const url = new URL(request.url);
    if (url.hostname === DOMAIN) {
      if (url.pathname === '/__box/boxes' || url.pathname.startsWith('/__box/boxes/')) return boxes(request, env, url);
      if (url.pathname === '/__box/users' || url.pathname.startsWith('/__box/users/')) return users(request, env, url);
      if (url.pathname.startsWith('/__box/testerarmy/')) return testerArmy(request, env, url);

      return text(`${HOST}: a box is https://<box>.${DOMAIN}, its API https://<box>-api.${DOMAIN}\n`, 404);
    }
    if (url.pathname.startsWith('/__box/') && !(await authorize(request)))
      return text(
        "needs `Authorization: Bearer <GitHub token>` with push access to novuhq/novu, or the Novu Box workflow's OIDC token\n",
        401
      );
    if (url.hostname === SLACK_HOST) return env.ROUTER.get(env.ROUTER.idFromName('router')).fetch(request);
    const box = boxOfHost(url.hostname);
    if (!box) return text(`not a box address: ${url.hostname}\n`, 404);

    return env.BOX.get(env.BOX.idFromName(box)).fetch(request);
  },
} satisfies ExportedHandler<HostEnv>;
