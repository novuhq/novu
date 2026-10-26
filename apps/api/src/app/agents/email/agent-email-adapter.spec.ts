import { createHmac } from 'node:crypto';
import type { EmailWebhookPayload } from '@novu/chat-adapter-email';
import { createNovuEmailAdapter } from '@novu/chat-adapter-email';
import { expect } from 'chai';
import sinon from 'sinon';

const SIGNING_SECRET = 'email-webhook-secret';

function createSignedRequest(payload: EmailWebhookPayload): Request {
  const body = JSON.stringify(payload);
  const timestamp = Date.now().toString();
  const signature = createHmac('sha256', SIGNING_SECRET).update(`${timestamp}.${body}`).digest('hex');

  return new Request('https://api.novu.test/v1/agents/agent-id/webhook/email', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'novu-signature': `t=${timestamp},v1=${signature}`,
    },
    body,
  });
}

describe('agent email adapter', () => {
  it('preserves the resolved thread ID on messages passed to Chat processing', async () => {
    const processMessage = sinon.stub();
    const adapter = createNovuEmailAdapter({
      signingSecret: SIGNING_SECRET,
      sendEmail: sinon.stub(),
      stripAgentReplyToken: (address) => address,
    });
    const state = {
      set: sinon.stub().resolves(),
      appendToList: sinon.stub().resolves(),
      setIfNotExists: sinon.stub().resolves(),
    };
    await adapter.initialize({
      getState: () => state,
      processMessage,
    } as never);

    if (!adapter.handleWebhook) {
      throw new Error('Email adapter must support webhooks');
    }

    const response = await adapter.handleWebhook(
      createSignedRequest({
        messageId: 'inbound-message@example.com',
        from: { address: 'person@example.com', name: 'Person' },
        to: [{ address: 'agent@example.com' }],
        subject: 'Agent reply',
        text: 'Hello',
        date: new Date().toISOString(),
      })
    );

    expect(response.status).to.equal(200);
    expect(processMessage.calledOnce).to.equal(true);
    const [, threadId, message] = processMessage.firstCall.args;
    expect(threadId).to.match(/^email:person%40example\.com:/);
    expect(message.threadId).to.equal(threadId);
  });

  describe('agent-opened threads (openDM → postMessage)', () => {
    function createOutboundAdapter(options: { defaultAgentAddress?: string }) {
      const sendEmail = sinon.stub().resolves({ messageId: 'sent@example.com' });
      const stored = new Map<string, unknown>();
      const state = {
        get: sinon.stub().callsFake(async (key: string) => stored.get(key) ?? null),
        set: sinon.stub().callsFake(async (key: string, value: unknown) => {
          stored.set(key, value);
        }),
        getList: sinon.stub().resolves([]),
        appendToList: sinon.stub().resolves(),
        setIfNotExists: sinon.stub().resolves(),
      };
      const adapter = createNovuEmailAdapter({
        signingSecret: SIGNING_SECRET,
        sendEmail,
        stripAgentReplyToken: (address) => address,
        ...options,
      });

      return { adapter, sendEmail, state };
    }

    it('sends from defaultAgentAddress when no inbound email opened the thread', async () => {
      const { adapter, sendEmail, state } = createOutboundAdapter({
        defaultAgentAddress: 'human-relay-abc@agentconnect.sh',
      });
      await adapter.initialize({ getState: () => state, processMessage: sinon.stub() } as never);

      const threadId = await adapter.openDM!('person@example.com');
      const sent = await adapter.postMessage(threadId, { markdown: 'Deploy to production?' });

      expect(sendEmail.calledOnce).to.equal(true);
      expect(sendEmail.firstCall.args[0].from).to.equal('human-relay-abc@agentconnect.sh');
      expect(sendEmail.firstCall.args[0].to).to.equal('person@example.com');
      expect(sent.raw.from).to.equal('human-relay-abc@agentconnect.sh');
    });

    it('still fails clearly when neither the thread nor the config has an agent address', async () => {
      const { adapter, sendEmail, state } = createOutboundAdapter({});
      await adapter.initialize({ getState: () => state, processMessage: sinon.stub() } as never);

      const threadId = await adapter.openDM!('person@example.com');

      let error: unknown;
      try {
        await adapter.postMessage(threadId, { markdown: 'Deploy to production?' });
      } catch (err) {
        error = err;
      }

      expect(error).to.be.instanceOf(Error);
      expect((error as Error).message).to.match(/No agent address found for thread/);
      expect(sendEmail.called).to.equal(false);
    });
  });
});
