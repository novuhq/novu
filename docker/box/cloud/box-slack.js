// A box's side of the Slack router (slack-router.js): what Box (worker.js) does for Novu Bot. Box calls it at its
// Slack hooks: `reset` when the container starts, `connect` on each alarm, `unregister` when the box is deleted,
// `env` for the box's environment, `state` for /__box/state, and `event` when the router hands the box an event.
// Without the router's settings (SLACK_ROUTER_URL) every hook does nothing, and boxes get no Slack.

import { boxOfOrigin, within } from './shared.mjs';

// What a call into the box (a command, its API) gets: a hung bridge or API mustn't stall the alarm.
const CALL_MS = 30 * 1000;
// Prints the API key and the agents the bridge app serves now, signed as box.mjs signs discover. An agent the
// bridge no longer serves keeps its bridge URL in the API, so the API's list can't tell.
const DISCOVER = `
const key = require('fs').readFileSync('/data/bridge/secret-key', 'utf8').trim();
const t = Date.now();
const v1 = require('crypto').createHmac('sha256', key).update(t + '.{}').digest('hex');
fetch('http://127.0.0.1:4000/api/novu?action=discover', {
  headers: { 'novu-signature': 't=' + t + ',v1=' + v1 },
  signal: AbortSignal.timeout(20000),
})
  .then((response) => response.json())
  .then(({ agents = [] }) => console.log(JSON.stringify({ key, served: agents.map((agent) => agent.agentId) })));
`;

export class BoxSlack {
  constructor(box) {
    this.box = box;
    this.storage = box.ctx.storage;
    this.enabled = Boolean(box.env.SLACK_ROUTER_URL);
  }

  // SLACK_API_URL sends the box's Slack calls to the router, which swaps its fake tokens for the real one.
  env() {
    return this.enabled ? { SLACK_API_URL: `${this.box.env.SLACK_ROUTER_URL}/api/` } : {};
  }

  // The last Slack events the router handed to the box's agents, newest last.
  async state() {
    return { slackEvents: (await this.storage.get('slackEvents')) ?? [] };
  }

  async reset() {
    await this.storage.delete('slackConnected');
    this.linked = new Set();
    this.apiKey = null;
  }

  async unregister() {
    const origin = await this.storage.get('origin');
    if (this.enabled && origin)
      await this.router()
        .unregister(boxOfOrigin(origin))
        .catch((error) => console.log(`slack: ${error.message}`));
  }

  // When the box is up, and again when the agents its bridge serves change (an apply): every one of them gets a
  // Slack integration, linked to it, with the signing secret and a bot token the router minted for this box, and a
  // workspace connection for Novu Bot's workspace. Then the router posts (or refreshes) the box's ready message in
  // #novu-box. It goes through the box's API from here, not from box.mjs, because a box keeps the box.mjs of the
  // snapshot it started from. A box started from another box's snapshot has that box's credentials until this
  // replaces them.
  async connect() {
    if (!this.enabled) return;
    const origin = await this.storage.get('origin');
    const output = await within(
      CALL_MS,
      this.box.output(['sh', '-c', 'test -f /data/.baked.json && node -e "$0"', DISCOVER]),
      'discover'
    );
    if (!origin || !output) return;
    const { key, served } = JSON.parse(output);
    this.apiKey = key;
    const api = (path, init) => this.api(origin, path, init);

    const box = boxOfOrigin(origin);
    // In storage: the Durable Object doesn't stay in memory between alarms.
    if (!served.length || served.sort().join(',') === (await this.storage.get('slackConnected'))) return;
    // An agent the bridge serves may not be in the API yet (a sync creates it); the next alarm connects it.
    const agents = (await api('/v1/agents?limit=50')).data.filter((agent) => served.includes(agent.identifier));
    const router = this.router();
    const slack = await router.register(
      box,
      origin,
      agents.map((agent) => agent.identifier)
    );
    const integrations = (await api('/v1/integrations')).data;
    const ready = [];
    for (const agent of agents) {
      const identifier = `box-slack-${agent.identifier}`;
      const credentials = { signingSecret: slack.signingSecret };
      const integration = integrations.find((item) => item.identifier === identifier);
      if (integration)
        await api(`/v1/integrations/${integration._id}`, {
          method: 'PUT',
          body: JSON.stringify({ credentials, check: false }),
        });
      else
        await api('/v1/integrations', {
          method: 'POST',
          body: JSON.stringify({
            providerId: 'slack',
            channel: 'chat',
            name: `Slack via the Novu Box router (${agent.identifier})`,
            identifier,
            active: true,
            check: false,
            credentials,
          }),
        });
      await api(`/v1/agents/${agent.identifier}/integrations`, {
        method: 'POST',
        body: JSON.stringify({ integrationIdentifier: identifier }),
      });
      const connection = {
        workspace: { id: slack.team.id, name: slack.team.name, botUserId: slack.botUserId },
        auth: { accessToken: slack.tokens[agent.identifier] },
      };
      const [existing] = (await api(`/v1/channel-connections?integrationIdentifier=${identifier}`)).data;
      if (existing)
        await api(`/v1/channel-connections/${existing.identifier}`, {
          method: 'PATCH',
          body: JSON.stringify(connection),
        });
      else
        await api('/v1/channel-connections', {
          method: 'POST',
          body: JSON.stringify({
            identifier,
            integrationIdentifier: identifier,
            connectionMode: 'shared',
            context: { 'novu-box': 'slack' },
            ...connection,
          }),
        });
      ready.push({ identifier: agent.identifier, id: agent._id, integrationIdentifier: identifier });
    }
    await router.ready(box, ready);
    const connected = ready
      .map((agent) => agent.identifier)
      .sort()
      .join(',');
    await this.storage.put('slackConnected', connected);
    console.log(`slack: ${box} connected ${connected}`);
  }

  // The Slack router hands the box an event for one of its agents, signed with the box's secret, and gets the
  // agent's answer; null while the box is asleep (this wakes it), starting or saving, and the router tries again.
  // The bridge agents answer only people linked to a subscriber (subscriberAccess `restricted`), so a person's first
  // event links them to subscriber slack-<user> in the box, as a customer's app does with <ConnectChat>.
  async event({ id, agent, user, headers, body, timeoutMs }) {
    this.box.touch();
    const origin = await this.storage.get('origin');
    const { phase } = await this.box.current();
    if (phase === 'saving') return null;
    if (!this.box.ctx.container.running) {
      if (phase === 'asleep') await this.box.wake(origin);

      return null;
    }
    this.linked ??= new Set();
    const integrationIdentifier = agent.integrationIdentifier;
    try {
      if (user && !this.linked.has(`${integrationIdentifier}:${user}`)) {
        await this.api(origin, '/v1/channel-endpoints', {
          method: 'POST',
          body: JSON.stringify({
            identifier: `${integrationIdentifier}-${user}`,
            subscriberId: `slack-${user}`,
            createSubscriberIfMissing: true,
            integrationIdentifier,
            connectionIdentifier: integrationIdentifier,
            type: 'slack_user',
            endpoint: { userId: user },
          }),
        });
        this.linked.add(`${integrationIdentifier}:${user}`);
      }
      const webhook = `${origin.replace(/^https:/, 'http:')}/v1/agents/${agent.id}/webhook/${integrationIdentifier}`;
      const response = await this.box.port().fetch(
        new Request(webhook, {
          method: 'POST',
          headers,
          body,
          ...(timeoutMs && { signal: AbortSignal.timeout(timeoutMs) }),
        })
      );
      // From the box's proxy while the API restarts.
      if (response.status === 502 || response.status === 504) return null;
      const answer = {
        ok: response.ok,
        status: response.status,
        contentType: response.headers.get('content-type') ?? 'application/json',
        text: await response.text(),
      };
      const events = (await this.storage.get('slackEvents')) ?? [];
      events.push({ id, agent: agent.identifier, user, status: answer.status, at: new Date().toISOString() });
      await this.storage.put('slackEvents', events.slice(-20));

      return answer;
    } catch (error) {
      console.log(`slack: ${agent.identifier} isn't answering yet: ${error.message}`);

      return null;
    }
  }

  router() {
    return this.box.env.ROUTER.get(this.box.env.ROUTER.idFromName('router'));
  }

  // The box's own API over its port, with the environment's secret key. 409 counts as done: the thing exists.
  async api(origin, path, init = {}) {
    this.apiKey ||= await within(CALL_MS, this.box.output(['cat', '/data/bridge/secret-key']), 'reading the API key');
    const response = await this.box.port().fetch(
      new Request(`${origin.replace(/^https:/, 'http:')}${path}`, {
        ...init,
        headers: { Authorization: `ApiKey ${this.apiKey}`, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(CALL_MS),
      })
    );
    const text = await response.text();
    if (!response.ok && response.status !== 409)
      throw new Error(`${init.method ?? 'GET'} ${path} -> ${response.status}: ${text.slice(0, 200)}`);

    return text ? JSON.parse(text) : null;
  }
}
