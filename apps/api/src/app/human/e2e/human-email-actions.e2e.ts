import { createHash } from 'node:crypto';
import { testServer, UserSession } from '@novu/testing';
import { expect } from 'chai';
import {
  type AgentEmailActionClaims,
  AgentEmailActionTokenService,
} from '../../agents/email/agent-email-action-token.service';

const PATH = '/v1/human/email-actions';

describe('Agent Inbox confirmation page #novu-v2', () => {
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  function claims(overrides: Partial<AgentEmailActionClaims> = {}): AgentEmailActionClaims {
    return {
      agentId: '000000000000000000000001',
      agentIdentifier: 'inbox',
      agentName: 'Atlas',
      integrationIdentifier: 'email',
      environmentId: session.environment._id,
      organizationId: session.organization._id,
      threadId: 'email:maya%40acme.co:abc',
      messageId: `<${Math.random().toString(36).slice(2)}@agentinbox.md>`,
      actionId: 'custom-button',
      label: 'Go ahead',
      userIdentifier: 'maya@acme.co',
      agentInbox: { question: 'Deploy to production?' },
      ...overrides,
    };
  }

  async function mint(overrides?: Partial<AgentEmailActionClaims>): Promise<string> {
    const { token } = await testServer.getService(AgentEmailActionTokenService).signActionToken(claims(overrides));

    return token;
  }

  it('shows the question on the link, which answers nothing', async () => {
    const token = await mint();

    const first = await session.testAgent.get(PATH).query({ t: token });
    const again = await session.testAgent.get(PATH).query({ t: token });

    expect(first.status).to.equal(200);
    expect(first.text).to.include('Deploy to production?');
    expect(first.text).to.include('>Go ahead</button>');
    expect(again.text).to.include('Deploy to production?');
  });

  it('sends a policy that lets the page’s own script run, past the API’s default one', async () => {
    const token = await mint();

    const page = await session.testAgent.get(PATH).query({ t: token });

    const script = page.text.slice(page.text.indexOf('<script>') + '<script>'.length, page.text.indexOf('</script>'));
    const hash = createHash('sha256').update(script).digest('base64');

    expect(script).to.include('cancel-button');
    expect(page.headers['content-security-policy']).to.include(`script-src 'sha256-${hash}'`);
  });

  it('turns away a link that is gone', async () => {
    const page = await session.testAgent.get(PATH).query({ t: 'gone' });

    expect(page.status).to.equal(200);
    expect(page.text).to.include('This link already did its job');
  });

  it('turns away the link of a Novu agent, which has its own page', async () => {
    const token = await mint({ agentInbox: undefined });

    const page = await session.testAgent.get(PATH).query({ t: token });

    expect(page.text).to.include('This link already did its job');
    expect(page.text).to.not.include('Deploy to production?');
  });

  it('reads the answer from the page’s form, and keeps the link when it could not be sent', async () => {
    const token = await mint();

    // No such agent, so the answer fails before it goes out.
    const failed = await session.testAgent.post(PATH).type('form').send({ t: token });
    const still = await session.testAgent.get(PATH).query({ t: token });

    expect(failed.status).to.equal(200);
    expect(failed.text).to.include('That didn’t go through');
    expect(still.text).to.include('Deploy to production?');
  });
});
