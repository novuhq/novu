import { SignUpOriginEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { UserRegisterCommand } from './user-register.command';
import { UserRegister } from './user-register.usecase';

describe('UserRegister', () => {
  const originalDisableRegistration = process.env.DISABLE_USER_REGISTRATION;

  afterEach(() => {
    if (originalDisableRegistration === undefined) {
      delete process.env.DISABLE_USER_REGISTRATION;
    } else {
      process.env.DISABLE_USER_REGISTRATION = originalDisableRegistration;
    }
  });

  function setup() {
    const user = { _id: 'user_1', email: 'ada@example.com' };
    const userRepository = {
      findByEmail: sinon.stub().resolves(null),
      create: sinon.stub().resolves(user),
      findById: sinon.stub().resolves(user),
    };
    const authService = { generateUserToken: sinon.stub().resolves('jwt') };
    const analyticsService = { upsertUser: sinon.stub(), track: sinon.stub(), mixpanelTrack: sinon.stub() };

    const usecase = new UserRegister(
      authService as never,
      userRepository as never,
      { execute: sinon.stub() } as never,
      analyticsService as never
    );

    return { usecase, analyticsService };
  }

  const register = (usecase: UserRegister, origin?: SignUpOriginEnum) =>
    usecase.execute(
      UserRegisterCommand.create({ email: 'ada@example.com', password: 'password123', firstName: 'Ada', origin })
    );

  it('tracks a CLI registration with source cli', async () => {
    delete process.env.DISABLE_USER_REGISTRATION;
    const { usecase, analyticsService } = setup();

    await register(usecase, SignUpOriginEnum.CLI);

    expect(analyticsService.mixpanelTrack.calledOnce).to.equal(true);
    expect(analyticsService.mixpanelTrack.firstCall.args).to.deep.equal([
      'Signup Started',
      'user_1',
      { source: 'cli', loginType: 'email' },
    ]);
  });

  for (const origin of [undefined, SignUpOriginEnum.WEB, SignUpOriginEnum.VERCEL]) {
    it(`tracks a ${origin ?? 'missing'} origin registration with source dashboard`, async () => {
      delete process.env.DISABLE_USER_REGISTRATION;
      const { usecase, analyticsService } = setup();

      await register(usecase, origin);

      expect(analyticsService.mixpanelTrack.firstCall.args[0]).to.equal('Signup Started');
      expect(analyticsService.mixpanelTrack.firstCall.args[2]).to.include({ source: 'dashboard' });
    });
  }

  it('keeps the existing [Authentication] - Signup event', async () => {
    delete process.env.DISABLE_USER_REGISTRATION;
    const { usecase, analyticsService } = setup();

    await register(usecase, SignUpOriginEnum.CLI);

    expect(analyticsService.track.firstCall.args).to.deep.equal([
      '[Authentication] - Signup',
      'user_1',
      { loginType: 'email', origin: SignUpOriginEnum.CLI, wasInvited: false },
    ]);
  });
});
