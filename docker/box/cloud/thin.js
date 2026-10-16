// Novu Box on Cloudflare, one box's Worker `novu-box-<box>` on workers.dev: the box's public address. It has no
// container. It checks /__box/* callers, then forwards every request unchanged, so the box sees this address as its
// own, to Box(<box>) in the host Worker `novu-box-host` (worker.js) through a Durable Object binding (`script_name`).
// A new box is only this Worker, which deploys in about 30 s instead of rolling out a container app. The Slack
// router's address, `novu-box-slack`, is this Worker too, bound to Router("router") in the host (slack-router.js).

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname.startsWith('/__box/') && !(await authorize(request)))
      return new Response('needs `Authorization: Bearer <GitHub token>` with push access to novuhq/novu\n', {
        status: 401,
      });

    return env.BOX.get(env.BOX.idFromName(env.BOX_NAME)).fetch(request);
  },
};

// Tokens checked in the last 5 minutes, by SHA-256; the token itself is never stored.
const authorized = new Map();

async function authorize(request) {
  const token = request.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return false;
  const key = await sha256(token);
  if (Date.now() - (authorized.get(key) ?? 0) < 5 * 60 * 1000) return true;
  const response = await fetch('https://api.github.com/repos/novuhq/novu', {
    headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'novu-box' },
  });
  if (!response.ok || !(await response.json()).permissions?.push) return false;
  authorized.set(key, Date.now());

  return true;
}

async function sha256(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));

  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
