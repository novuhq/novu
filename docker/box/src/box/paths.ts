// Where things are in the box: the image's own files under BOX, everything that survives a snapshot under /data.

export const BOX = process.env.BOX_HOME ?? '/opt/box';
export const DATA = '/data';
export const REPO = `${DATA}/novu`;
// nx itself, not through `pnpm nx`, which adds a pnpm start to every call.
export const NX = 'node_modules/.bin/nx';
export const BAKED = `${DATA}/.baked.json`;
export const APPLIED = `${DATA}/.applied.json`;
// Written before an apply checks out its commit and removed when it succeeds; see apply.ts.
export const APPLYING = `${DATA}/.applying.json`;
export const MIGRATED = `${DATA}/.migrated`;
export const RUN = `${DATA}/run`;
export const LOCK = `${RUN}/box.lock`;
export const PC_SOCKET = `${RUN}/process-compose.sock`;
// process-compose writes every process's output to one file, a JSON line each ({process, message}); see logs.ts.
export const PC_LOG = `${DATA}/logs/process-compose.log`;
export const DEPLOY = `${DATA}/deploy`;
export const BULLMQ_PRO = `${DATA}/bullmq-pro`;
export const REDIS_TLS = `${DATA}/redis/tls`;
export const REDIS_PORTS = [7000, 7001, 7002] as const;
export const MAIL_HOST = 'mail.box.internal';
export const SINK_URL = 'http://sink.box.internal:8026';
export const BRIDGE_URL = 'http://bridge.box.internal:4000/api/novu';
export const BRIDGE_SECRET = `${DATA}/bridge/secret-key`;
export const MANAGED_AGENT = 'box-managed';
export const REPO_URL = process.env.BOX_REPO_URL ?? 'https://github.com/novuhq/novu.git';
export const API_HEALTH = 'http://127.0.0.1:3000/v1/health-check';
export const WORKER_HEALTH = 'http://127.0.0.1:3004/v1/health-check';
