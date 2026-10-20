import type { HttpException } from '@nestjs/common';
import { ApiAuthSchemeEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { AGENT_PAUSED, HumanAgentPausedGuard } from './human-agent-paused.guard';
import { AGENT_INBOX_DASHBOARD_SECRET_HEADER } from './human-dashboard-secret.guard';

describe('HumanAgentPausedGuard', () => {
  const SECRET = 'unit-human-dashboard-secret';
  const originalSecret = process.env.AGENT_INBOX_DASHBOARD_API_SECRET;
  const PAUSED_AT = '2026-10-15T08:00:00.000Z';

  beforeEach(() => {
    process.env.AGENT_INBOX_DASHBOARD_API_SECRET = SECRET;
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.AGENT_INBOX_DASHBOARD_API_SECRET;
    } else {
      process.env.AGENT_INBOX_DASHBOARD_API_SECRET = originalSecret;
    }
  });

  /** The paused relay agent of the environment, or `null` while none is paused. */
  function setup(paused: Record<string, unknown> | null = { pausedAt: PAUSED_AT }) {
    const agentRepository = { findOne: sinon.stub().resolves(paused) };

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

  async function refusal(request: Record<string, unknown>, paused?: Record<string, unknown> | null) {
    return (await setup(paused)
      .guard.canActivate(contextOf(request))
      .catch((caught: unknown) => caught)) as HttpException | boolean;
  }

  it('refuses a host while a relay agent is paused, with a code and the time it was paused', async () => {
    const { guard, agentRepository } = setup();

    const error = (await guard
      .canActivate(contextOf(hostRequest()))
      .catch((caught: unknown) => caught)) as HttpException;

    expect(error.getStatus()).to.equal(403);
    expect(error.getResponse()).to.include({ code: AGENT_PAUSED, pausedAt: PAUSED_AT });
    expect(agentRepository.findOne.firstCall.args[0]).to.deep.equal({
      _environmentId: 'env1',
      _organizationId: 'org1',
      runtime: 'human_relay',
      pausedAt: { $exists: true, $ne: null },
    });
  });

  it('refuses a call with the key that names no host too', async () => {
    const error = await refusal(hostRequest({ headers: {} }));

    expect((error as HttpException).getStatus()).to.equal(403);
  });

  it('refuses a host however the call names the agent: another one, a malformed name or none', async () => {
    for (const request of [
      hostRequest({ query: { agentIdentifier: 'no-such-agent' } }),
      hostRequest({ body: { agentIdentifier: 'deploy-relay' } }),
      hostRequest({ query: { agentIdentifier: '$where' } }),
      hostRequest({ query: { agentIdentifier: { $ne: 'human-relay' } } }),
      hostRequest({ query: undefined }),
    ]) {
      const error = await refusal(request);

      expect((error as HttpException).getStatus()).to.equal(403);
    }
  });

  it('lets the operator’s dashboard read a paused agent’s inbox', async () => {
    const { guard, agentRepository } = setup();

    const allowed = await guard.canActivate(
      contextOf(hostRequest({ headers: { [AGENT_INBOX_DASHBOARD_SECRET_HEADER]: SECRET } }))
    );

    expect(allowed).to.equal(true);
    expect(agentRepository.findOne.called).to.equal(false);
  });

  it('treats a wrong dashboard secret as a host', async () => {
    const error = await refusal(hostRequest({ headers: { [AGENT_INBOX_DASHBOARD_SECRET_HEADER]: 'guess' } }));

    expect((error as HttpException).getStatus()).to.equal(403);
  });

  it('lets a person signed in to Novu through', async () => {
    const request = hostRequest({ user: { environmentId: 'env1', organizationId: 'org1', scheme: 'Bearer' } });

    expect(await refusal(request)).to.equal(true);
  });

  it('lets hosts through while no relay agent is paused', async () => {
    expect(await refusal(hostRequest(), null)).to.equal(true);
  });
});
