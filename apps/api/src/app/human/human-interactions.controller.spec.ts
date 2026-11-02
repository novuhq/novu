import { expect } from 'chai';
import sinon from 'sinon';
import { AGENT_INBOX_DASHBOARD_SECRET_HEADER } from './guards/human-dashboard-secret.guard';
import { HumanInteractionsController } from './human-interactions.controller';

describe('HumanInteractionsController setup', () => {
  const user = { environmentId: 'env1', organizationId: 'org1', _id: 'user1' } as never;
  const signUp = { operator: true, email: 'ada@acme.co', emailVerified: true };
  const fromDashboard = { [AGENT_INBOX_DASHBOARD_SECRET_HEADER]: 'shh' };
  const originalSecret = process.env.AGENT_INBOX_DASHBOARD_API_SECRET;

  beforeEach(() => {
    process.env.AGENT_INBOX_DASHBOARD_API_SECRET = 'shh';
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.AGENT_INBOX_DASHBOARD_API_SECRET;
    } else {
      process.env.AGENT_INBOX_DASHBOARD_API_SECRET = originalSecret;
    }
  });

  /** What reaches the usecase for a request with this body and these headers. */
  async function commandFor(body: Record<string, unknown>, headers: Record<string, unknown>) {
    const execute = sinon.stub().resolves({ agentId: 'relay1' });
    const controller: HumanInteractionsController = Object.assign(
      Object.create(HumanInteractionsController.prototype),
      { setupHumanRelayUsecase: { execute } }
    );

    await controller.setup(user, body as never, headers);

    return execute.firstCall.args[0];
  }

  it('trusts the flag from the dashboard’s server', async () => {
    const command = await commandFor(signUp, fromDashboard);

    expect(command.emailVerified).to.equal(true);
    expect(command.email).to.equal('ada@acme.co');
  });

  it('ignores the flag from a host, which holds the same key but not the secret', async () => {
    const command = await commandFor(signUp, {});

    expect(command.emailVerified).to.equal(false);
  });

  it('ignores the flag with a wrong secret', async () => {
    const command = await commandFor(signUp, { [AGENT_INBOX_DASHBOARD_SECRET_HEADER]: 'nope' });

    expect(command.emailVerified).to.equal(false);
  });

  it('does not trust the email just because the dashboard sent it', async () => {
    const command = await commandFor({ operator: true, email: 'ada@acme.co' }, fromDashboard);

    expect(command.emailVerified).to.equal(false);
  });

  it('only takes a real true from the dashboard', async () => {
    const command = await commandFor({ ...signUp, emailVerified: 'true' }, fromDashboard);

    expect(command.emailVerified).to.equal(false);
  });

  it('ignores the flag where no secret is set up, as in Community and self-hosted', async () => {
    delete process.env.AGENT_INBOX_DASHBOARD_API_SECRET;

    const command = await commandFor(signUp, { [AGENT_INBOX_DASHBOARD_SECRET_HEADER]: '' });

    expect(command.emailVerified).to.equal(false);
  });
});
