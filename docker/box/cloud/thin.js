// Novu Box on Cloudflare, one box's Worker `novu-box-<box>` on workers.dev: the box's public address. It has no
// container. It checks /__box/* callers (auth.mjs), then forwards every request unchanged, so the box sees this
// address as its own, to Box(<box>) in the host Worker `novu-box-host` (worker.js) through a Durable Object binding
// (`script_name`). A new box is only this Worker, which deploys in about 30 s instead of rolling out a container app.
// The Slack router's address, `novu-box-slack`, is this Worker too, bound to Router("router") in the host
// (slack-router.js). The host uploads this file with auth.mjs and shared.mjs for a box CI creates (boxes.js).

import { authorize } from './auth.mjs';

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname.startsWith('/__box/') && !(await authorize(request)))
      return new Response(
        'needs `Authorization: Bearer <GitHub token>` with push access to novuhq/novu, or the Novu Box workflow\'s OIDC token\n',
        { status: 401 }
      );

    return env.BOX.get(env.BOX.idFromName(env.BOX_NAME)).fetch(request);
  },
};
