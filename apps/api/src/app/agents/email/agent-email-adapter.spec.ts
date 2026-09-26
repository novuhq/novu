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
});
