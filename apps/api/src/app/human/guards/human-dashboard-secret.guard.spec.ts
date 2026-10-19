import { ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { expect } from 'chai';
import {
  assertFromHumanDashboard,
  DASHBOARD_ONLY,
  HUMAN_DASHBOARD_SECRET_HEADER,
  HumanDashboardSecretGuard,
} from './human-dashboard-secret.guard';

describe('HumanDashboardSecretGuard', () => {
  const originalSecret = process.env.HUMAN_DASHBOARD_API_SECRET;

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.HUMAN_DASHBOARD_API_SECRET;
    } else {
      process.env.HUMAN_DASHBOARD_API_SECRET = originalSecret;
    }
  });

  function check(headers: Record<string, string>, { available = true } = {}) {
    const guard = new HumanDashboardSecretGuard({ isAvailable: () => available } as never);
    const context = { switchToHttp: () => ({ getRequest: () => ({ headers }) }) };

    return () => guard.canActivate(context as never);
  }

  it('hides the endpoints when no secret is configured', () => {
    delete process.env.HUMAN_DASHBOARD_API_SECRET;

    expect(check({ [HUMAN_DASHBOARD_SECRET_HEADER]: '' })).to.throw(NotFoundException);
  });

  it('hides the endpoints without the Clerk-backed enterprise auth', () => {
    process.env.HUMAN_DASHBOARD_API_SECRET = 'shh';

    expect(check({ [HUMAN_DASHBOARD_SECRET_HEADER]: 'shh' }, { available: false })).to.throw(NotFoundException);
  });

  it('rejects a missing or wrong secret', () => {
    process.env.HUMAN_DASHBOARD_API_SECRET = 'shh';

    expect(check({})).to.throw(UnauthorizedException);
    expect(check({ [HUMAN_DASHBOARD_SECRET_HEADER]: 'nope' })).to.throw(UnauthorizedException);
  });

  it('lets the Human dashboard through with the shared secret', () => {
    process.env.HUMAN_DASHBOARD_API_SECRET = 'shh';

    expect(check({ [HUMAN_DASHBOARD_SECRET_HEADER]: 'shh' })()).to.equal(true);
  });
});

describe('assertFromHumanDashboard', () => {
  const originalSecret = process.env.HUMAN_DASHBOARD_API_SECRET;

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.HUMAN_DASHBOARD_API_SECRET;
    } else {
      process.env.HUMAN_DASHBOARD_API_SECRET = originalSecret;
    }
  });

  function refusal(headers: Record<string, unknown> | undefined) {
    try {
      assertFromHumanDashboard(headers);

      return null;
    } catch (error) {
      return error as ForbiddenException;
    }
  }

  it('lets the Human dashboard through with the shared secret', () => {
    process.env.HUMAN_DASHBOARD_API_SECRET = 'shh';

    expect(refusal({ [HUMAN_DASHBOARD_SECRET_HEADER]: 'shh' })).to.equal(null);
  });

  it('refuses a host, with a code it can tell apart', () => {
    process.env.HUMAN_DASHBOARD_API_SECRET = 'shh';

    for (const headers of [{}, { [HUMAN_DASHBOARD_SECRET_HEADER]: 'nope' }, undefined]) {
      const error = refusal(headers);

      expect(error).to.be.instanceOf(ForbiddenException);
      expect(error?.getResponse()).to.include({ code: DASHBOARD_ONLY });
    }
  });

  it('refuses everyone when no secret is configured', () => {
    delete process.env.HUMAN_DASHBOARD_API_SECRET;

    expect(refusal({ [HUMAN_DASHBOARD_SECRET_HEADER]: '' })).to.be.instanceOf(ForbiddenException);
  });
});
