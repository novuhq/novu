import { CacheService } from '@novu/application-generic';
import {
  AgentRepository,
  ConversationActivityRepository,
  ConversationActivitySenderTypeEnum,
  ConversationParticipantTypeEnum,
  ConversationRepository,
  ConversationStatusEnum,
  EnvironmentRepository,
} from '@novu/dal';
import { CLI_USER_CODE_PATTERN } from '@novu/shared';
import { testServer, UserSession } from '@novu/testing';
import { expect } from 'chai';
import { Types } from 'mongoose';
import {
  CONNECT_CODE_EXPIRED,
  CONNECT_CODE_INVALID,
  CONNECT_CODE_MAX_FAILURES,
  CONNECT_CODE_TOO_MANY_TRIES,
  CONNECT_CODE_USED,
  connectCodeKey,
} from '../services/human-connect-code.service';
import { AGENT_INBOX_HOST_HEADER, AGENT_INBOX_VIA_HEADER } from '../services/human-host-status.service';

const agentRepository = new AgentRepository();
const conversationRepository = new ConversationRepository();
const conversationActivityRepository = new ConversationActivityRepository();
const environmentRepository = new EnvironmentRepository();

/** A network address of its own for each test (from a benchmarking range), as wrong codes are counted per network. */
function randomNetwork(): string {
  return `198.18.${Math.floor(Math.random() * 256)}.${1 + Math.floor(Math.random() * 254)}`;
}

const OPERATOR_ID = 'ada';

/**
 * A host connects to the relay agent with a one-time code from the dashboard, and the agent knows its
 * hosts by name: which way each came in (CLI or MCP), when it last checked the inbox, and what was waiting.
 */
describe('Agent Inbox hosts (one-time codes and host status) #novu-v2', () => {
  let session: UserSession;
  let handle: string;
  let network: string;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    // Wrong codes are counted per handle and kept in Redis across tests, so every test has its own.
    handle = `atlas-${Math.random().toString(36).slice(2, 10)}`;
    network = randomNetwork();

    const setupRes = await session.testAgent
      .post('/v1/human/setup')
      .send({ subscriberId: OPERATOR_ID, operator: true, firstName: 'Ada' });
    expect(setupRes.status).to.equal(200, JSON.stringify(setupRes.body));
  });

  /** As the dashboard's server and the CLI call it: with the environment's secret key. */
  function asAccount(path: string, method: 'get' | 'post' = 'get') {
    return session.testAgent[method](path).set('Authorization', `ApiKey ${session.apiKey}`);
  }

  /** A code as the dashboard asks for one, on a host's tab of the host picker when `host` names one. */
  async function issueCode(host?: string): Promise<{ code: string; handle: string; expiresAt: string }> {
    const res = await asAccount('/v1/human/agent/connect-codes', 'post').send(host ? { handle, host } : { handle });
    expect(res.status).to.equal(200, JSON.stringify(res.body));

    return res.body.data;
  }

  /**
   * `agentinbox connect`: no credentials, only the agent and the code, from this test's network by default,
   * saying which host runs it when `host` names one.
   */
  function connect(agent: string, code: string, from: string = network, host?: string) {
    const request = session.testAgent.post('/v1/human/connect').set('Authorization', '').set('X-Forwarded-For', from);

    return (host ? request.set(AGENT_INBOX_HOST_HEADER, host) : request).send({ agent, code });
  }

  async function hostStatus(): Promise<Record<string, any>> {
    const res = await asAccount('/v1/human/agent/hosts');
    expect(res.status).to.equal(200, JSON.stringify(res.body));

    return res.body.data;
  }

  /** The inbox, as a host reads it when `via` says how it came in, and `host` which host it is. */
  async function listInbox(via?: string, query: Record<string, string> = {}, host?: string) {
    let request = asAccount('/v1/human/inbox').query({ senders: 'all', ...query });
    if (via) {
      request = request.set(AGENT_INBOX_VIA_HEADER, via);
    }
    if (host) {
      request = request.set(AGENT_INBOX_HOST_HEADER, host);
    }
    const res = await request;
    expect(res.status).to.equal(200, JSON.stringify(res.body));

    return res.body;
  }

  /** A wrong code that can't be the right one by chance. */
  function otherCodeThan(code: string): string {
    return code === 'BCDF-GHJK' ? 'GHJK-BCDF' : 'BCDF-GHJK';
  }

  /** What became of a code, as the dashboard asks while it shows one. */
  function codeStatus(code: string, fields: Record<string, string> = { handle }) {
    return asAccount('/v1/human/agent/connect-codes/status', 'post').send({ ...fields, code });
  }

  /** Rewrites a code's record in Redis, as time passing would leave it. */
  async function changeCode(code: string, change: (record: Record<string, any>) => Record<string, any>) {
    const cache = testServer.getService(CacheService);
    const key = connectCodeKey(handle, code);
    const record = JSON.parse(await cache.get(key));
    await cache.set(key, JSON.stringify(change(record)), { ttl: 60, jitter: false });
  }

  describe('one-time code', () => {
    it('is issued for the agent and connects a host once, with the key login would save', async () => {
      const issued = await issueCode();

      expect(issued.code).to.match(CLI_USER_CODE_PATTERN);
      expect(issued.handle).to.equal(handle);
      const expiresIn = Date.parse(issued.expiresAt) - Date.now();
      expect(expiresIn).to.be.greaterThan(9 * 60 * 1000);
      expect(expiresIn).to.be.at.most(10 * 60 * 1000);

      // Asked again while unused, the dashboard gets the same code, so a page can ask on every render.
      expect((await issueCode()).code).to.equal(issued.code);

      const res = await connect(handle, issued.code);
      expect(res.status).to.equal(200, JSON.stringify(res.body));
      expect(res.body.data).to.deep.equal({
        apiKey: session.apiKey,
        environmentId: session.environment._id,
        agent: { identifier: 'human-relay', name: res.body.data.agent.name, handle },
        host: 'general',
      });

      const reused = await connect(handle, issued.code);
      expect(reused.status).to.equal(409, JSON.stringify(reused.body));
      expect(reused.body.code).to.equal(CONNECT_CODE_USED);
      expect(reused.body.data).to.equal(undefined);

      // A used code is not handed out again.
      expect((await issueCode()).code).to.not.equal(issued.code);
    });

    it('takes the agent as an address and the code in any case or spacing', async () => {
      const { code } = await issueCode();

      const res = await connect(`${handle.toUpperCase()}@agentinbox.md`, code.toLowerCase().replace('-', ' '));

      expect(res.status).to.equal(200, JSON.stringify(res.body));
      expect(res.body.data.agent.handle).to.equal(handle);
    });

    it('fails clearly once the code ran out', async () => {
      const { code } = await issueCode();
      const cache = testServer.getService(CacheService);
      const key = connectCodeKey(handle, code);
      const record = JSON.parse(await cache.get(key));
      await cache.set(key, JSON.stringify({ ...record, expiresAt: Math.floor(Date.now() / 1000) - 1 }), {
        ttl: 60,
        jitter: false,
      });

      const res = await connect(handle, code);

      expect(res.status).to.equal(410, JSON.stringify(res.body));
      expect(res.body.code).to.equal(CONNECT_CODE_EXPIRED);
      expect(res.body.message).to.contain('10 minutes');
    });

    it('fails clearly for a wrong code, and for a right code given with another agent', async () => {
      const { code } = await issueCode();

      const wrongCode = await connect(handle, otherCodeThan(code));
      expect(wrongCode.status).to.equal(404, JSON.stringify(wrongCode.body));
      expect(wrongCode.body.code).to.equal(CONNECT_CODE_INVALID);

      const wrongAgent = await connect(`not-${handle}`, code);
      expect(wrongAgent.status).to.equal(404, JSON.stringify(wrongAgent.body));
      expect(wrongAgent.body.code).to.equal(CONNECT_CODE_INVALID);

      const malformed = await connect(handle, 'hello');
      expect(malformed.status).to.equal(404, JSON.stringify(malformed.body));

      // A few wrong tries don't burn the right code.
      expect((await connect(handle, code)).status).to.equal(200);
    });

    it('bounds guessing: after too many wrong codes a network gets none for the agent, the right one included', async () => {
      const { code } = await issueCode();

      for (let attempt = 0; attempt < CONNECT_CODE_MAX_FAILURES; attempt++) {
        const res = await connect(handle, otherCodeThan(code));
        expect(res.status).to.equal(404, `attempt ${attempt + 1}: ${JSON.stringify(res.body)}`);
      }

      const locked = await connect(handle, code);

      expect(locked.status).to.equal(429, JSON.stringify(locked.body));
      expect(locked.body.code).to.equal(CONNECT_CODE_TOO_MANY_TRIES);
      expect(locked.body.data).to.equal(undefined);
    });

    it('does not let wrong codes from one network lock the agent for another', async () => {
      const { code } = await issueCode();

      for (let attempt = 0; attempt < CONNECT_CODE_MAX_FAILURES; attempt++) {
        await connect(handle, otherCodeThan(code));
      }
      expect((await connect(handle, code)).status).to.equal(429);

      // Someone who knows the handle can't keep the agent's own host from connecting.
      const host = await connect(handle, code, randomNetwork());
      expect(host.status).to.equal(200, JSON.stringify(host.body));
      expect(host.body.data.apiKey).to.equal(session.apiKey);
    });

    it('is stale once the account key changed after it was made', async () => {
      const { code } = await issueCode();
      // As when the key is regenerated: the environment's current key is another one now.
      await environmentRepository.update(
        { _id: session.environment._id, _organizationId: session.organization._id },
        { $set: { 'apiKeys.0.hash': `replaced-${Date.now()}` } }
      );

      const res = await connect(handle, code);

      expect(res.status).to.equal(410, JSON.stringify(res.body));
      expect(res.body.code).to.equal(CONNECT_CODE_EXPIRED);
      expect(res.body.message).to.contain('key changed');
      expect(res.body.data).to.equal(undefined);
    });

    it('is only issued for an agent that exists, under a handle that can be typed', async () => {
      const badHandle = await asAccount('/v1/human/agent/connect-codes', 'post').send({ handle: 'Atlas Prime' });
      expect(badHandle.status).to.equal(422, JSON.stringify(badHandle.body));

      const unknownAgent = await asAccount('/v1/human/agent/connect-codes', 'post').send({
        handle,
        agentIdentifier: 'no-such-relay',
      });
      expect(unknownAgent.status).to.equal(404, JSON.stringify(unknownAgent.body));
    });

    it('cannot be redeemed for an agent that was deleted after the code was made', async () => {
      const { code } = await issueCode();
      await agentRepository.delete({
        identifier: 'human-relay',
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
      });

      const res = await connect(handle, code);

      expect(res.status).to.equal(404, JSON.stringify(res.body));
      expect(res.body.data).to.equal(undefined);
    });
  });

  describe('code status', () => {
    it('tells an unused code, then the same code once a host used it, and asking is not a try', async () => {
      const issued = await issueCode();

      const unused = await codeStatus(issued.code);
      expect(unused.status).to.equal(200, JSON.stringify(unused.body));
      expect(unused.body.data).to.deep.equal({ code: issued.code, status: 'unused', expiresAt: issued.expiresAt });

      // Asking left the code as it was: still the one handed out, and it still connects a host.
      expect((await issueCode()).code).to.equal(issued.code);
      expect((await connect(handle, issued.code)).status).to.equal(200);

      // Taken in any case or spacing, as `connect` takes it.
      const used = await codeStatus(issued.code.toLowerCase().replace('-', ' '));
      expect(used.status).to.equal(200, JSON.stringify(used.body));
      expect(used.body.data).to.include({ code: issued.code, status: 'used', expiresAt: issued.expiresAt });
      expect(Math.abs(Date.parse(used.body.data.usedAt) - Date.now())).to.be.lessThan(60 * 1000);
    });

    it('tells a code used in its last two minutes as used, though a new code is handed out by then', async () => {
      const issued = await issueCode();
      await changeCode(issued.code, (record) => ({ ...record, expiresAt: Math.floor(Date.now() / 1000) + 90 }));

      // With under two minutes left the dashboard is handed a new code, while the old one still works.
      const next = await issueCode();
      expect(next.code).to.not.equal(issued.code);
      expect((await codeStatus(issued.code)).body.data.status).to.equal('unused');

      expect((await connect(handle, issued.code)).status).to.equal(200);

      const res = await codeStatus(issued.code);
      expect(res.status).to.equal(200, JSON.stringify(res.body));
      expect(res.body.data.status).to.equal('used');
      // The new code was not used.
      expect((await codeStatus(next.code)).body.data.status).to.equal('unused');
    });

    it('tells a code that ran out as expired', async () => {
      const { code } = await issueCode();
      await changeCode(code, (record) => ({ ...record, expiresAt: Math.floor(Date.now() / 1000) - 1 }));

      const res = await codeStatus(code);

      expect(res.status).to.equal(200, JSON.stringify(res.body));
      expect(res.body.data.status).to.equal('expired');
      expect(res.body.data).to.not.have.property('usedAt');
    });

    it('tells a code made before the account key changed as expired, and a new code is handed out', async () => {
      const { code } = await issueCode();
      // Made with a key the environment no longer has. Replacing the environment's key instead would also
      // shut out this test's own requests, which sign in with it.
      await changeCode(code, (record) => ({ ...record, keyFingerprint: `replaced-${Date.now()}` }));

      const res = await codeStatus(code);

      expect(res.status).to.equal(200, JSON.stringify(res.body));
      expect(res.body.data.status).to.equal('expired');
      expect((await issueCode()).code).to.not.equal(code);
    });

    it('tells nothing of another account’s code, another agent’s, or one never made', async () => {
      const { code } = await issueCode();

      const other = new UserSession();
      await other.initialize();
      const otherSetup = await other.testAgent
        .post('/v1/human/setup')
        .send({ subscriberId: OPERATOR_ID, operator: true, firstName: 'Ada' });
      expect(otherSetup.status).to.equal(200, JSON.stringify(otherSetup.body));
      const otherAccount = await other.testAgent
        .post('/v1/human/agent/connect-codes/status')
        .send({ handle, code })
        .set('Authorization', `ApiKey ${other.apiKey}`);
      expect(otherAccount.status).to.equal(404, JSON.stringify(otherAccount.body));
      expect(otherAccount.body.code).to.equal(CONNECT_CODE_INVALID);
      expect(otherAccount.body.data).to.equal(undefined);

      // A second relay agent in the same environment doesn't see the first one's codes either.
      const secondSetup = await session.testAgent
        .post('/v1/human/setup')
        .send({ subscriberId: 'someone-else', operator: true, agentIdentifier: 'second-relay' });
      expect(secondSetup.status).to.equal(200, JSON.stringify(secondSetup.body));
      const otherAgent = await codeStatus(code, { handle, agentIdentifier: 'second-relay' });
      expect(otherAgent.status).to.equal(404, JSON.stringify(otherAgent.body));

      // Each answer is the same as for a code that was never made, or one asked for under another handle.
      const neverMade = await codeStatus(otherCodeThan(code));
      expect(neverMade.status).to.equal(404, JSON.stringify(neverMade.body));
      expect(neverMade.body.code).to.equal(CONNECT_CODE_INVALID);
      expect(otherAccount.body.message).to.equal(neverMade.body.message);
      expect((await codeStatus(code, { handle: `not-${handle}` })).status).to.equal(404);
      expect((await codeStatus('hello')).status).to.equal(404);

      // The code is still the agent's own, unused.
      expect((await codeStatus(code)).body.data.status).to.equal('unused');
    });

    it('takes only a handle that can be typed, and only with the right to ask for codes', async () => {
      const { code } = await issueCode();

      expect((await codeStatus(code, { handle: 'Atlas Prime' })).status).to.equal(422);
      expect((await codeStatus(code, {})).status).to.equal(422);

      const unauthenticated = await session.testAgent
        .post('/v1/human/agent/connect-codes/status')
        .send({ handle, code })
        .set('Authorization', '');
      expect(unauthenticated.status).to.equal(401, JSON.stringify(unauthenticated.body));
    });
  });

  describe('host status', () => {
    it('records the MCP host when setup itself comes through the MCP', async () => {
      const mcpSession = new UserSession();
      await mcpSession.initialize();

      const setupRes = await mcpSession.testAgent
        .post('/v1/human/setup')
        .set('Authorization', `ApiKey ${mcpSession.apiKey}`)
        .set(AGENT_INBOX_VIA_HEADER, 'mcp')
        .send({ subscriberId: 'mcp-operator', operator: true, firstName: 'Ada', agentName: 'Atlas' });
      expect(setupRes.status).to.equal(200, JSON.stringify(setupRes.body));

      const status = await mcpSession.testAgent
        .get('/v1/human/agent/hosts')
        .set('Authorization', `ApiKey ${mcpSession.apiKey}`);
      expect(status.status).to.equal(200, JSON.stringify(status.body));
      expect(status.body.data.connected).to.equal(true);
      expect(status.body.data.hosts).to.have.length(1);
      // The MCP server said nothing of the app here, so it counts as General.
      expect(status.body.data.hosts[0]).to.include({ id: 'general', via: 'mcp', lastCheckedAt: null });
      expect(status.body.data.hosts[0].connectedAt).to.be.a('string');

      const withoutVia = new UserSession();
      await withoutVia.initialize();
      const plain = await withoutVia.testAgent
        .post('/v1/human/setup')
        .set('Authorization', `ApiKey ${withoutVia.apiKey}`)
        .send({ subscriberId: 'plain-operator', operator: true, firstName: 'Ada' });
      expect(plain.status).to.equal(200, JSON.stringify(plain.body));
      const plainStatus = await withoutVia.testAgent
        .get('/v1/human/agent/hosts')
        .set('Authorization', `ApiKey ${withoutVia.apiKey}`);
      expect(plainStatus.status).to.equal(200, JSON.stringify(plainStatus.body));
      expect(plainStatus.body.data.connected).to.equal(false);
      expect(plainStatus.body.data.hosts).to.deep.equal([]);
    });

    it('reports no host before one connects, then the CLI host that used a code', async () => {
      expect(await hostStatus()).to.deep.equal({
        connected: false,
        lastCheckedAt: null,
        lastCheckedVia: null,
        lastCheckedHost: null,
        hosts: [],
        firstCheckedAt: null,
        waitingMessage: null,
      });

      const { code } = await issueCode();
      expect((await connect(handle, code)).status).to.equal(200);

      const status = await hostStatus();
      expect(status.connected).to.equal(true);
      expect(status.hosts).to.have.length(1);
      expect(status.hosts[0]).to.include({ id: 'general', via: 'cli', lastCheckedAt: null });
      expect(status.hosts[0].connectedAt).to.be.a('string');
      expect(status.lastCheckedAt).to.equal(null);
      expect(status.firstCheckedAt).to.equal(null);
    });

    it('records when a host last checked the inbox, and how; the dashboard’s own reads do not count', async () => {
      await listInbox();
      await listInbox(undefined, {}, 'claude-code');
      expect((await hostStatus()).connected).to.equal(false);

      await listInbox('cli', {}, 'claude-code');
      const afterCli = await hostStatus();
      expect(afterCli.connected).to.equal(true);
      expect(afterCli.lastCheckedVia).to.equal('cli');
      expect(afterCli.lastCheckedHost).to.equal('claude-code');
      expect(afterCli.lastCheckedAt).to.be.a('string');
      expect(afterCli.firstCheckedAt).to.equal(afterCli.lastCheckedAt);
      expect(afterCli.waitingMessage).to.equal(null);

      await listInbox('mcp', {}, 'chatgpt');
      const afterMcp = await hostStatus();
      expect(afterMcp.lastCheckedVia).to.equal('mcp');
      expect(afterMcp.lastCheckedHost).to.equal('chatgpt');
      expect(afterMcp.hosts.map((host: { id: string; via: string }) => [host.id, host.via])).to.deep.equal([
        ['chatgpt', 'mcp'],
        ['claude-code', 'cli'],
      ]);
      expect(afterMcp.firstCheckedAt).to.equal(afterCli.firstCheckedAt);

      // A header that names neither way is not a host.
      await listInbox('dashboard', {}, 'codex');
      expect((await hostStatus()).hosts).to.have.length(2);
    });

    it('names each host, one entry each, whichever way it came in and on however many computers', async () => {
      // Claude Code connects on two computers, Codex on one; ChatGPT signs in through MCP.
      for (const host of ['claude-code', 'claude-code', 'codex']) {
        const { code } = await issueCode();
        const res = await connect(handle, code, randomNetwork(), host);
        expect(res.status).to.equal(200, JSON.stringify(res.body));
        expect(res.body.data.host).to.equal(host);
      }
      await listInbox('cli', {}, 'claude-code');
      await listInbox('cli', {}, 'codex');
      await listInbox('mcp', {}, 'chatgpt');

      const status = await hostStatus();
      expect(status.hosts.map((host: { id: string }) => host.id).sort()).to.deep.equal([
        'chatgpt',
        'claude-code',
        'codex',
      ]);
      for (const host of status.hosts) {
        expect(host.lastCheckedAt, host.id).to.be.a('string');
      }

      // Claude Code through its plugin, which signs in to the MCP server, is the same Claude Code.
      const claudeCode = status.hosts.find((host: { id: string }) => host.id === 'claude-code');
      await agentRepository.update(
        {
          _environmentId: session.environment._id,
          _organizationId: session.organization._id,
          identifier: 'human-relay',
        },
        { $set: { 'hosts.byId.claude-code.lastCheckedAt': new Date(Date.now() - 2 * 60 * 1000).toISOString() } }
      );
      await listInbox('mcp', {}, 'claude-code');
      const afterPlugin = await hostStatus();
      expect(afterPlugin.hosts).to.have.length(3);
      const sameClaudeCode = afterPlugin.hosts.find((host: { id: string }) => host.id === 'claude-code');
      expect(sameClaudeCode).to.include({ via: 'mcp', connectedAt: claudeCode.connectedAt });
      expect(afterPlugin.lastCheckedHost).to.equal('claude-code');
    });

    it('counts a host that says nothing, or names one Agent Inbox does not know, as General', async () => {
      await listInbox('cli');
      await listInbox('mcp', {}, 'windsurf');

      const status = await hostStatus();
      expect(status.hosts.map((host: { id: string }) => host.id)).to.deep.equal(['general']);
    });

    it('says the host saw the message that was waiting for it on its first check', async () => {
      const conversation = await seedUnreadConversation('Re: Hi, I’m Atlas', 'Hello from Ada');

      // Waiting, not yet seen: no host has looked.
      expect((await hostStatus()).waitingMessage).to.equal(null);

      const page = await listInbox('cli', { filter: 'unread' });
      expect(page.data.map((thread: { id: string }) => thread.id)).to.include(conversation.identifier);

      const status = await hostStatus();
      expect(status.waitingMessage).to.deep.include({
        conversationId: conversation.identifier,
        from: 'Ada',
        subject: 'Re: Hi, I’m Atlas',
      });
      expect(status.waitingMessage.seenAt).to.equal(status.firstCheckedAt);
      expect(Date.parse(status.waitingMessage.at)).to.be.at.most(Date.parse(status.waitingMessage.seenAt));

      // Looking is not responding: the conversation stays unread for the host to answer.
      expect((await listInbox(undefined, { filter: 'unread' })).data).to.have.length(1);

      // Later checks keep the first one's message, another host's too.
      const show = await asAccount(`/v1/human/inbox/${conversation.identifier}`)
        .set(AGENT_INBOX_VIA_HEADER, 'mcp')
        .set(AGENT_INBOX_HOST_HEADER, 'claude');
      expect(show.status).to.equal(200, JSON.stringify(show.body));
      const later = await hostStatus();
      expect(later.waitingMessage).to.deep.equal(status.waitingMessage);
      expect(later.lastCheckedVia).to.equal('mcp');
      expect(later.lastCheckedHost).to.equal('claude');
    });
  });

  describe('host of a one-time code', () => {
    it('counts the host the code was made for when the CLI does not say which host runs it', async () => {
      const forHermes = await issueCode('hermes');
      const forNoHost = await issueCode();
      expect(forHermes.code).to.not.equal(forNoHost.code);
      // Asked again on the same tab, the dashboard gets the same code.
      expect((await issueCode('hermes')).code).to.equal(forHermes.code);

      const res = await connect(handle, forHermes.code);
      expect(res.status).to.equal(200, JSON.stringify(res.body));
      expect(res.body.data.host).to.equal('hermes');

      const status = await hostStatus();
      expect(status.hosts).to.have.length(1);
      expect(status.hosts[0]).to.include({ id: 'hermes', via: 'cli', lastCheckedAt: null });
    });

    it('goes by the host the CLI says runs it over the tab the code was made on', async () => {
      const { code } = await issueCode('openclaw');

      const res = await connect(handle, code, network, 'codex');

      expect(res.status).to.equal(200, JSON.stringify(res.body));
      expect(res.body.data.host).to.equal('codex');
      expect((await hostStatus()).hosts.map((host: { id: string }) => host.id)).to.deep.equal(['codex']);
    });

    it('is only made for a host Agent Inbox knows', async () => {
      const res = await asAccount('/v1/human/agent/connect-codes', 'post').send({ handle, host: 'windsurf' });

      expect(res.status).to.equal(422, JSON.stringify(res.body));
    });
  });

  describe('hosts from before hosts had names', () => {
    it('keeps their history as General until a named host checks the inbox', async () => {
      // As an agent was left before hosts were told apart: one entry for each way in.
      await agentRepository.update(
        {
          _environmentId: session.environment._id,
          _organizationId: session.organization._id,
          identifier: 'human-relay',
        },
        {
          $set: {
            'hosts.cli': { connectedAt: '2026-10-01T10:00:00.000Z', lastCheckedAt: '2026-10-20T10:00:00.000Z' },
            'hosts.mcp': { connectedAt: '2026-10-05T10:00:00.000Z', lastCheckedAt: '2026-10-21T10:00:00.000Z' },
            'hosts.firstCheckedAt': '2026-10-01T10:05:00.000Z',
          },
        }
      );

      const before = await hostStatus();
      expect(before).to.include({
        connected: true,
        lastCheckedAt: '2026-10-21T10:00:00.000Z',
        lastCheckedVia: 'mcp',
        lastCheckedHost: 'general',
        firstCheckedAt: '2026-10-01T10:05:00.000Z',
      });
      expect(before.hosts).to.deep.equal([
        {
          id: 'general',
          via: 'mcp',
          connectedAt: '2026-10-01T10:00:00.000Z',
          lastCheckedAt: '2026-10-21T10:00:00.000Z',
        },
      ]);

      await listInbox('cli', {}, 'claude-code');

      const after = await hostStatus();
      expect(after.hosts.map((host: { id: string }) => host.id)).to.deep.equal(['claude-code']);
      expect(after.firstCheckedAt).to.equal('2026-10-01T10:05:00.000Z');
    });
  });

  /** A conversation in which the operator wrote to the agent and nobody answered yet. */
  async function seedUnreadConversation(title: string, text: string) {
    const agentRes = await session.testAgent.get('/v1/human/agent');
    expect(agentRes.status).to.equal(200, JSON.stringify(agentRes.body));
    const agentId = agentRes.body.data.agentId as string;
    const integrationId = new Types.ObjectId().toString();
    const platformThreadId = `email:${Date.now()}`;
    const now = new Date().toISOString();

    const conversation = await conversationRepository.create({
      identifier: `conv_${Math.random().toString(36).slice(2)}`,
      _agentId: agentId,
      participants: [
        { type: ConversationParticipantTypeEnum.SUBSCRIBER, id: OPERATOR_ID },
        { type: ConversationParticipantTypeEnum.AGENT, id: agentId },
      ],
      channels: [{ platform: 'email', _integrationId: integrationId, platformThreadId }],
      status: ConversationStatusEnum.ACTIVE,
      title,
      metadata: {},
      isDirectMessage: true,
      lastActivityAt: now,
      lastHumanMessageAt: now,
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    await conversationActivityRepository.createUserActivity({
      identifier: `act_${Math.random().toString(36).slice(2)}`,
      conversationId: conversation._id,
      platform: 'email',
      integrationId,
      platformThreadId,
      senderType: ConversationActivitySenderTypeEnum.SUBSCRIBER,
      senderId: OPERATOR_ID,
      content: text,
      environmentId: session.environment._id,
      organizationId: session.organization._id,
    });

    return conversation;
  }
});
