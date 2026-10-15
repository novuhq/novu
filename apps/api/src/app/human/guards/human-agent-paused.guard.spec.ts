import type { HttpException } from '@nestjs/common';
import { ApiAuthSchemeEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { AGENT_PAUSED, HumanAgentPausedGuard } from './human-agent-paused.guard';
import { HUMAN_DASHBOARD_SECRET_HEADER } from './human-dashboard-secret.guard';

describe('HumanAgentPausedGuard', () => {
  const SECRET = 'unit-human-dashboard-secret';
  const originalSecret = process.env.HUMAN_DASHBOARD_API_SECRET;
  const PAUSED_AT = '2026-10-15T08:00:00.000Z';

  beforeEach(() => {
    process.env.HUMAN_DASHBOARD_API_SECRET = SECRET;
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.HUMAN_DASHBOARD_API_SECRET;
    } else {
      process.env.HUMAN_DASHBOARD_API_SECRET = originalSecret;
    }
  });

  function setup(agent: Record<string, unknown> | null = { runtime: 'human_relay', pausedAt: PAUSED_AT }) {
    const agentRepository = { findOne: sinon.stub().resolves(agent) };

    return { guard: new HumanAgentPausedGuard(agentRepository as never), agentRepository };
  }

  function contextOf(request: Record<string, unknown>) {
    return { switchToHttp: () => ({ getRequest: () => request }) } as never;
  }

  function hostRequest(overrides: Record<string, unknown> = {}) {
    return {
      user: { environmentId: 'env1', organizationId: 'org1', scheme: ApiAuthSchemeEnum.API_KEY },
      headers: { 'agent-inbox-via': 'cli' },
      query: {},
      ...overrides,
    };
  }

  it('refuses a host while the agent is paused, with a code and the time it was paused', async () => {
    const { guard, agentRepository } = setup();

    const error = (await guard
      .canActivate(contextOf(hostRequest()))
      .catch((caught: unknown) => caught)) as HttpException;

    expect(error.getStatus()).to.equal(403);
    expect(error.getResponse()).to.include({
      code: AGENT_PAUSED,
      pausedAt: PAUSED_AT,
    });
    expect(agentRepository.findOne.firstCall.args[0]).to.deep.equal({
      identifier: 'human-relay',
      _environmentId: 'env1',
      _organizationId: 'org1',
    });
  });

  it('refuses a call with the key that names no host too', async () => {
    const { guard } = setup();

    const error = await guard.canActivate(contextOf(hostRequest({ headers: {} }))).catch((caught: Error) => caught);

    expect((error as { status?: number }).status).to.equal(403);
  });

  it('checks the relay agent the call names, in its query or its body', async () => {
    const { guard, agentRepository } = setup(null);

    await guard.canActivate(contextOf(hostRequest({ query: { agentIdentifier: 'ops-relay' } })));
    await guard.canActivate(contextOf(hostRequest({ body: { agentIdentifier: 'deploy-relay' } })));

    expect(agentRepository.findOne.firstCall.args[0].identifier).to.equal('ops-relay');
    expect(agentRepository.findOne.secondCall.args[0].identifier).to.equal('deploy-relay');
  });

  it('lets the operator’s dashboard read a paused agent’s inbox', async () => {
    const { guard, agentRepository } = setup();

    const allowed = await guard.canActivate(
      contextOf(hostRequest({ headers: { [HUMAN_DASHBOARD_SECRET_HEADER]: SECRET } }))
    );

    expect(allowed).to.equal(true);
    expect(agentRepository.findOne.called).to.equal(false);
  });

  it('treats a wrong dashboard secret as a host', async () => {
    const { guard } = setup();

    const error = await guard
      .canActivate(contextOf(hostRequest({ headers: { [HUMAN_DASHBOARD_SECRET_HEADER]: 'guess' } })))
      .catch((caught: Error) => caught);

    expect((error as { status?: number }).status).to.equal(403);
  });

  it('lets a person signed in to Novu through', async () => {
    const { guard } = setup();
    const request = hostRequest({ user: { environmentId: 'env1', organizationId: 'org1', scheme: 'Bearer' } });

    expect(await guard.canActivate(contextOf(request))).to.equal(true);
  });

  it('lets hosts through while the agent is not paused, or is not there', async () => {
    expect(await setup({ runtime: 'human_relay' }).guard.canActivate(contextOf(hostRequest()))).to.equal(true);
    expect(await setup(null).guard.canActivate(contextOf(hostRequest()))).to.equal(true);
  });

  it('leaves a malformed agent identifier to the endpoint’s own validation', async () => {
    const { guard, agentRepository } = setup();

    const allowed = await guard.canActivate(contextOf(hostRequest({ query: { agentIdentifier: '$where' } })));

    expect(allowed).to.equal(true);
    expect(agentRepository.findOne.called).to.equal(false);
  });
});
