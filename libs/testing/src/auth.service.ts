import { UserEntity, UserRepository } from '@novu/dal';
import { AuthProviderEnum } from '@novu/shared';
import { UserService } from './user.service';
import * as request from 'supertest';

export class AuthService {
  private userService = new UserService();
  private userRepository = new UserRepository();

  constructor(public serverUrl = `http://localhost:${process.env.PORT}`) {}

  async authenticate(
    authProvider: AuthProviderEnum,
    accessToken: string,
    refreshToken: string,
    profile: { name: string; login: string; email: string; avatar_url: string; id: string }
  ) {
    const { email } = profile;
    let user = await this.userRepository.findByEmailOrLoginProvider(email, {
      profileId: profile.id,
      provider: authProvider,
    });

    let newUser = false;
    const userCredentials = {
      username: profile.login,
      provider: authProvider,
      accessToken,
      refreshToken,
    };

    if (!user) {
      user = await this.userService.createUser({
        profilePicture: profile.avatar_url,
        email: email,
        lastName: profile.name ? profile.name.split(' ').slice(-1).join(' ') : null,
        firstName: profile.name ? profile.name.split(' ').slice(0, -1).join(' ') : profile.login,
        tokens: [{ ...userCredentials, providerId: profile.id, valid: true }],
      });
      newUser = true;
    } else {
      if (authProvider === AuthProviderEnum.GITHUB) {
        const withoutUsername = user.tokens.find(
          (i) => i.provider === AuthProviderEnum.GITHUB && !i.username && String(i.providerId) === String(profile.id)
        );
        // Checks if user's github primary email already exists but from a different authentication provider.
        const withoutToken = user.tokens.findIndex((i) => i.provider === AuthProviderEnum.GITHUB) === -1;
        const userUpdates: Promise<any>[] = [];

        if (withoutUsername || email !== user.email) {
          userUpdates.push(
            this.userRepository.update(
              {
                _id: user._id,
                'tokens.providerId': profile.id,
              },
              {
                $set: {
                  ...(withoutUsername && { 'tokens.$.username': profile.login }),
                  ...(email !== user.email && { email }),
                },
              }
            )
          );
        }
        if (withoutToken) {
          userUpdates.push(
            this.userRepository.update(
              { _id: user._id },
              {
                $push: {
                  tokens: {
                    ...userCredentials,
                    providerId: profile.id,
                    valid: true,
                  },
                },
              }
            )
          );
        }

        if (userUpdates.length) {
          await Promise.all(userUpdates);
          user = await this.userRepository.findById(user._id);
          if (!user) throw new Error('User not found');
        }
      }
    }

    return {
      newUser,
      token: await this.generateUserToken(user),
    };
  }

  async getSignedToken(user: UserEntity, organizationId?: string, environmentId?: string): Promise<string> {
    const response = await request(this.serverUrl).get(
      `/v1/auth/test/token/${user._id}?environmentId=${environmentId ?? ''}&organizationId=${organizationId ?? ''}`
    );

    return `Bearer ${response.body.data}`;
  }

  async generateUserToken(user: UserEntity) {
    return this.getSignedToken(user);
  }
}
