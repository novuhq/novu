import { AuthProviderEnum, SignUpOriginEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { CommunityAuthService } from './community.auth.service';

describe('CommunityAuthService.authenticate', () => {
  const profile = { name: 'Ada Lovelace', login: 'ada', email: 'ada@example.com', avatar_url: '', id: 'gh_1' };
  const user = { _id: 'user_1', email: 'ada@example.com', tokens: [] };

  function setup(existingUser: unknown = null) {
    const userRepository = { findByEmail: sinon.stub().resolves(existingUser) };
    const createUser = { execute: sinon.stub().resolves(user) };
    const analyticsService = {
      alias: sinon.stub(),
      track: sinon.stub(),
      mixpanelTrack: sinon.stub(),
      upsertUser: sinon.stub(),
    };
    const organizationRepository = { findUserActiveOrganizations: sinon.stub().resolves([]) };
    const jwtService = { sign: sinon.stub().returns('jwt') };

    const service = new CommunityAuthService(
      userRepository as never,
      {} as never,
      createUser as never,
      jwtService as never,
      analyticsService as never,
      organizationRepository as never,
      {} as never,
      {} as never,
      {} as never
    );

    return { service, analyticsService };
  }

  const signupStartedCalls = (analyticsService: ReturnType<typeof setup>['analyticsService']) =>
    analyticsService.mixpanelTrack.getCalls().filter((call) => call.args[0] === 'Signup Started');

  it('tracks a CLI signup with source cli', async () => {
    const { service, analyticsService } = setup();

    await service.authenticate(AuthProviderEnum.GITHUB, 'access', 'refresh', profile, '', {
      origin: SignUpOriginEnum.CLI,
    });

    expect(signupStartedCalls(analyticsService).map((call) => call.args)).to.deep.equal([
      ['Signup Started', 'user_1', { source: 'cli', loginType: AuthProviderEnum.GITHUB }],
    ]);
    expect(analyticsService.track.calledWith('[Authentication] - Signup', 'user_1')).to.equal(true);
  });

  for (const origin of [undefined, SignUpOriginEnum.WEB, SignUpOriginEnum.VERCEL]) {
    it(`tracks a ${origin ?? 'missing'} origin signup with source dashboard`, async () => {
      const { service, analyticsService } = setup();

      await service.authenticate(AuthProviderEnum.GITHUB, 'access', 'refresh', profile, '', { origin });

      expect(signupStartedCalls(analyticsService)).to.have.length(1);
      expect(signupStartedCalls(analyticsService)[0].args[2]).to.include({ source: 'dashboard' });
    });
  }

  it('does not track a signup when an existing user logs in', async () => {
    const { service, analyticsService } = setup({ ...user, tokens: [] });

    await service.authenticate(AuthProviderEnum.GITHUB, 'access', 'refresh', profile, '');

    expect(signupStartedCalls(analyticsService)).to.have.length(0);
  });
});
