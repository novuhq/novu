import { CacheService } from '@novu/application-generic';
import {
  AgentRepository,
  ConversationActivityRepository,
  ConversationActivitySenderTypeEnum,
  ConversationParticipantTypeEnum,
  ConversationRepository,
  ConversationStatusEnum,
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
import { AGENT_INBOX_VIA_HEADER } from '../services/human-host-status.service';

const agentRepository = new AgentRepository();
const conversationRepository = new ConversationRepository();
const conversationActivityRepository = new ConversationActivityRepository();

const OPERATOR_ID = 'ada';

/**
 * A host connects to the relay agent with a one-time code from the dashboard, and the agent knows its
 * hosts: which way each came in (CLI or MCP), when it last checked the inbox, and what was waiting for it.
 */
describe('Agent Inbox hosts (one-time codes and host status) #novu-v2', () => {
  let session: UserSession;
  let handle: string;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    // Wrong codes are counted per handle and kept in Redis across tests, so every test has its own.
    handle = `atlas-${Math.random().toString(36).slice(2, 10)}`;

    const setupRes = await session.testAgent
      .post('/v1/human/setup')
      .send({ subscriberId: OPERATOR_ID, operator: true, firstName: 'Ada' });
    expect(setupRes.status).to.equal(200, JSON.stringify(setupRes.body));
  });

  /** As the dashboard's server and the CLI call it: with the environment's secret key. */
  function asAccount(path: string, method: 'get' | 'post' = 'get') {
    return session.testAgent[method](path).set('Authorization', `ApiKey ${session.apiKey}`);
  }

  async function issueCode(): Promise<{ code: string; handle: string; expiresAt: string }> {
    const res = await asAccount('/v1/human/agent/connect-codes', 'post').send({ handle });
    expect(res.status).to.equal(200, JSON.stringify(res.body));

    return res.body.data;
  }

  /** `agentinbox connect`: no credentials, only the agent and the code. */
  function connect(agent: string, code: string) {
    return session.testAgent.post('/v1/human/connect').set('Authorization', '').send({ agent, code });
  }

  async function hostStatus(): Promise<Record<string, any>> {
    const res = await asAccount('/v1/human/agent/hosts');
    expect(res.status).to.equal(200, JSON.stringify(res.body));

    return res.body.data;
  }

  async function listInbox(via?: string, query: Record<string, string> = {}) {
    const request = asAccount('/v1/human/inbox').query({ senders: 'all', ...query });
    const res = await (via ? request.set(AGENT_INBOX_VIA_HEADER, via) : request);
    expect(res.status).to.equal(200, JSON.stringify(res.body));

    return res.body;
  }

  /** A wrong code that can't be the right one by chance. */
  function otherCodeThan(code: string): string {
    return code === 'BCDF-GHJK' ? 'GHJK-BCDF' : 'BCDF-GHJK';
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

    it('bounds guessing: after too many wrong codes the agent takes none for a while, the right one included', async () => {
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

  describe('host status', () => {
    it('reports no host before one connects, then the CLI host that used a code', async () => {
      expect(await hostStatus()).to.deep.equal({
        connected: false,
        lastCheckedAt: null,
        lastCheckedVia: null,
        hosts: [],
        firstCheckedAt: null,
        waitingMessage: null,
      });

      const { code } = await issueCode();
      expect((await connect(handle, code)).status).to.equal(200);

      const status = await hostStatus();
      expect(status.connected).to.equal(true);
      expect(status.hosts).to.have.length(1);
      expect(status.hosts[0]).to.include({ via: 'cli', lastCheckedAt: null });
      expect(status.hosts[0].connectedAt).to.be.a('string');
      expect(status.lastCheckedAt).to.equal(null);
      expect(status.firstCheckedAt).to.equal(null);
    });

    it('records when a host last checked the inbox, and how; the dashboard’s own reads do not count', async () => {
      await listInbox();
      expect((await hostStatus()).connected).to.equal(false);

      await listInbox('cli');
      const afterCli = await hostStatus();
      expect(afterCli.connected).to.equal(true);
      expect(afterCli.lastCheckedVia).to.equal('cli');
      expect(afterCli.lastCheckedAt).to.be.a('string');
      expect(afterCli.firstCheckedAt).to.equal(afterCli.lastCheckedAt);
      expect(afterCli.waitingMessage).to.equal(null);

      await listInbox('mcp');
      const afterMcp = await hostStatus();
      expect(afterMcp.lastCheckedVia).to.equal('mcp');
      expect(afterMcp.hosts.map((host: { via: string }) => host.via)).to.deep.equal(['mcp', 'cli']);
      expect(afterMcp.firstCheckedAt).to.equal(afterCli.firstCheckedAt);

      // A header that names neither is not a host.
      await listInbox('dashboard');
      expect((await hostStatus()).hosts).to.have.length(2);
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

      // Later checks keep the first one's message.
      const show = await asAccount(`/v1/human/inbox/${conversation.identifier}`).set(AGENT_INBOX_VIA_HEADER, 'mcp');
      expect(show.status).to.equal(200, JSON.stringify(show.body));
      const later = await hostStatus();
      expect(later.waitingMessage).to.deep.equal(status.waitingMessage);
      expect(later.lastCheckedVia).to.equal('mcp');
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
