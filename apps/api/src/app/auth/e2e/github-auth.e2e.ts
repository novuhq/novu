import { UserSession, AuthService } from '@novu/testing';
import { AuthProviderEnum, SignUpOriginEnum } from '@novu/shared';
import { UserRepository } from '@novu/dal';
import { expect } from 'chai';
import * as passport from 'passport';
import * as githubPassport from 'passport-github2';
import { stub } from 'sinon';

const userGithubProfile = {
  authProvider: AuthProviderEnum.GITHUB,
  accessToken: 'gho_16C7e42F2',
  refreshToken: 'v9hRvIfhvFfuEv11YsSHUA==',
  profile: {
    name: 'first last',
    login: '',
    email: 'test@gmail.com',
    avatar_url: 'https://github.com/test/test_avatar',
    id: '34567',
  },
  origin: SignUpOriginEnum.CLI,
};

const githubQueryParamSample = `access_token=${
  userGithubProfile.accessToken
}42F2&token_type=bearer&state=${JSON.stringify({})}`;

let session: UserSession;
let userRepository: UserRepository;

describe('Github Auth', () => {
  userRepository = new UserRepository();

  process.env.GITHUB_OAUTH_CLIENT_ID = '12345';
  process.env.GITHUB_OAUTH_CLIENT_SECRET = 'secret';

  before(async () => {
    session = new UserSession();
    await session.initialize();
    await setPassportGithubStrategy();
  });

  it('should be able to sign up with github', async () => {
    stubPassportAuthenticate();
    await session.testAgent.get(`/v1/auth/github/callback?${githubQueryParamSample}`);
    const user = await userRepository.findByEmail(userGithubProfile.profile.email);

    expect(user).to.not.be.null;
    expect(user?.email).to.equal(userGithubProfile.profile.email);
    expect(`${user?.firstName} ${user?.lastName}`).to.equal(userGithubProfile.profile.name);
  });

  it('should sign user to same account if user github email is updated', async () => {
    const passportStub = stubPassportAuthenticate();
    await session.testAgent.get(`/v1/auth/github/callback?${githubQueryParamSample}`);
    const user = await userRepository.findByEmail(userGithubProfile.profile.email);

    const email = 'test2@gmail.com';
    passportStub.restore();
    stubPassportAuthenticate({ ...userGithubProfile, profile: { ...userGithubProfile.profile, email } });
    await session.testAgent.get(`/v1/auth/github/callback?${githubQueryParamSample}`);
    const user2 = await userRepository.findByEmail(email);

    expect(user?._id).to.equal(user2?._id);
  });

  it('should update user account email with updated github email', async () => {
    const passportStub = stubPassportAuthenticate();
    await session.testAgent.get(`/v1/auth/github/callback?${githubQueryParamSample}`);
    const user = await userRepository.findByEmail(userGithubProfile.profile.email);

    const email = 'test2@gmail.com';
    passportStub.restore();
    stubPassportAuthenticate({ ...userGithubProfile, profile: { ...userGithubProfile.profile, email } });
    await session.testAgent.get(`/v1/auth/github/callback?${githubQueryParamSample}`);
    const user2 = await userRepository.findByEmail(email);

    expect(user2?.email).to.equal(email);
    expect(user?.email).to.equal(userGithubProfile.profile.email);
    expect(user?.email).to.not.equal(user2?.email);
  });
});

const setPassportGithubStrategy = async () => {
  const strategy = new githubPassport.Strategy(
    {
      clientID: process.env.GITHUB_OAUTH_CLIENT_ID,
      clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET,
      callbackURL: '/auth/github/callback',
    },
    async function (
      accessToken: string,
      refreshToken: string,
      profile: any,
      done: (err: unknown, user: { newUser: boolean; token: string }) => void
    ) {
      const authService = new AuthService();
      const { newUser, token } = await authService.authenticate(
        AuthProviderEnum.GITHUB,
        accessToken ?? '',
        refreshToken ?? '',
        profile
      );
      done(null, { newUser, token });
    }
  );

  passport.use(strategy);
};

const stubPassportAuthenticate = (githubProfile = userGithubProfile) => {
  return stub(passport._strategies.github, 'authenticate').callsFake(function verified() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    this._verify(githubProfile.accessToken, githubProfile.refreshToken, githubProfile.profile, (_, user, info) => {
      return self.success(user, info);
    });
  });
};
