import { decode } from '../../shared/contracts.ts';
import { bearer } from '../../shared/names.ts';
import { identity, isDm, label, NOT_SLACK, type RouterCore, SLACK_API, SLACK_FILES, slackAnswer } from './core.ts';
import { BoxParams, type Identity, type Owner, type Params, type SlackResult } from './model.ts';

const METHODS: Record<string, string | null> = {
  'chat.postMessage': 'channel',
  'chat.postEphemeral': 'channel',
  'chat.update': 'channel',
  'chat.delete': 'channel',
  'chat.startStream': 'channel',
  'chat.appendStream': 'channel',
  'chat.stopStream': 'channel',
  'reactions.add': 'channel',
  'reactions.remove': 'channel',
  'conversations.history': 'channel',
  'conversations.replies': 'channel',
  'conversations.info': 'channel',
  'assistant.threads.setStatus': 'channel_id',
  'files.completeUploadExternal': 'channel_id',
  'files.getUploadURLExternal': null,
  'conversations.open': null,
  'users.info': null,
  'views.open': null,
  'views.update': null,
  'views.push': null,
};
// Parameters that also name channels, which the router doesn't check, so a call with them is refused. @slack/web-api
// sends files.uploadV2's `channels` as `channel_id`, so the agents never use this one.
const UNCHECKED_CHANNELS: Record<string, string> = { 'files.completeUploadExternal': 'channels' };
const OWN_MESSAGE = new Set(['chat.update', 'chat.delete', 'chat.appendStream', 'chat.stopStream']);

export async function outbound(core: RouterCore, request: Request, method: string): Promise<Response> {
  const raw = await request.text();
  const json = Boolean(request.headers.get('content-type')?.includes('json'));
  const params: Params = json
    ? decode(BoxParams, raw || '{}', NOT_SLACK)
    : Object.fromEntries(new URLSearchParams(raw));
  const owner = await core.storage.get<Owner>(`token:${bearer(request) ?? params.token}`);
  if (!owner) return passThrough(request, method, raw);
  delete params.token;
  if (method === 'auth.test') return Response.json(authTest(await identity(core)));
  const refused = await refusal(core, method, params, owner);
  if (refused) {
    console.log(`refused ${method} from ${label(owner)}: ${refused}`);

    return Response.json({ ok: false, error: refused });
  }
  if (method === 'chat.postMessage' || method === 'chat.postEphemeral') params.username = label(owner);
  const response = await fetch(`${SLACK_API}${method}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${core.env.SLACK_BOT_TOKEN ?? ''}`,
      'Content-Type': json ? 'application/json; charset=utf-8' : 'application/x-www-form-urlencoded',
    },
    body: json
      ? JSON.stringify(params)
      : new URLSearchParams(Object.entries(params).map(([name, value]) => [name, String(value)])),
  });
  const body = await slackAnswer(response, method);
  if (body.ok) await record(core, method, params, body, owner);
  else console.log(`${label(owner)} ${method}: ${body.error}`);
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  const retryAfter = response.headers.get('retry-after');
  if (retryAfter) headers['retry-after'] = retryAfter;

  return new Response(JSON.stringify(body), { status: response.status, headers });
}

async function refusal(core: RouterCore, method: string, params: Params, owner: Owner): Promise<string | null> {
  if (!Object.hasOwn(METHODS, method)) return 'method_not_allowed_by_novu_box';
  const unchecked = UNCHECKED_CHANNELS[method];
  if (unchecked && params[unchecked]) return 'channel_not_allowed_by_novu_box';
  const parameter = METHODS[method];
  const channel = parameter ? params[parameter] : undefined;
  if (parameter && !(await allowedChannel(core, channel))) return 'channel_not_allowed_by_novu_box';
  if (OWN_MESSAGE.has(method) && (await core.storage.get<Owner>(`msg:${channel}:${params.ts}`))?.box !== owner.box)
    return 'message_not_owned_by_this_box';

  return null;
}

async function allowedChannel(core: RouterCore, channel: Params[string]): Promise<boolean> {
  if (channel === core.env.SLACK_CHANNEL) return true;
  if (typeof channel !== 'string' || !isDm(channel)) return false;

  return Boolean(await core.storage.get(`dm:${channel}`));
}

async function record(core: RouterCore, method: string, params: Params, body: SlackResult, owner: Owner) {
  if (method === 'chat.postMessage' || method === 'chat.startStream')
    await core.storage.put(`msg:${body.channel}:${body.ts}`, owner);
  if (method === 'chat.postEphemeral' && body.message_ts)
    await core.storage.put(`msg:${params.channel}:${body.message_ts}`, owner);
  if (method.startsWith('views.') && body.view?.id) await core.storage.put(`view:${body.view.id}`, owner);
  if (method === 'files.getUploadURLExternal' && body.upload_url)
    body.upload_url = `${core.env.SLACK_ROUTER_URL}/upload?url=${encodeURIComponent(body.upload_url)}`;
}

export async function download(core: RouterCore, request: Request, url: URL): Promise<Response> {
  if (!(await core.storage.get(`token:${bearer(request)}`))) return new Response('unknown token\n', { status: 403 });
  const response = await fetch(`${SLACK_FILES}${url.pathname.slice('/files/'.length)}${url.search}`, {
    headers: { Authorization: `Bearer ${core.env.SLACK_BOT_TOKEN ?? ''}` },
  });

  return relayed(response);
}

export async function upload(core: RouterCore, request: Request, url: URL): Promise<Response> {
  const target = URL.parse(url.searchParams.get('url') ?? '');
  if (target?.origin !== new URL(SLACK_FILES).origin) return new Response('not a Slack upload URL\n', { status: 400 });
  if (!(await core.storage.get(`token:${bearer(request)}`))) return new Response('unknown token\n', { status: 403 });
  const response = await fetch(target.href, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${core.env.SLACK_BOT_TOKEN ?? ''}`,
      'Content-Type': request.headers.get('content-type') ?? 'application/octet-stream',
    },
    body: await request.arrayBuffer(),
  });

  return relayed(response);
}

async function passThrough(request: Request, method: string, raw: string): Promise<Response> {
  const authorization = request.headers.get('authorization');
  const get = request.method === 'GET';
  const headers: Record<string, string> = {};
  if (authorization) headers.authorization = authorization;
  if (!get) headers['content-type'] = request.headers.get('content-type') ?? 'application/x-www-form-urlencoded';
  const response = await fetch(`${SLACK_API}${method}${new URL(request.url).search}`, {
    method: get ? 'GET' : 'POST',
    headers,
    ...(!get && { body: raw }),
  });

  return relayed(response, true);
}

// Slack's answer as it came: its status and body, with the headers worth keeping (all of them for a pass-through,
// but the encoding and length of a body fetch already decompressed).
function relayed(response: Response, allHeaders = false): Response {
  const names = allHeaders
    ? [...response.headers.keys()].filter((name) => name !== 'content-encoding' && name !== 'content-length')
    : ['content-type', 'content-length', 'content-disposition'];
  const headers = Object.fromEntries(
    names.flatMap((name) => {
      const value = response.headers.get(name);

      return value ? [[name, value]] : [];
    })
  );

  return new Response(response.body, { status: response.status, headers });
}

function authTest(me: Identity) {
  return { ok: true, url: me.url, team: me.team.name, team_id: me.team.id, user_id: me.botUserId, bot_id: me.botId };
}
