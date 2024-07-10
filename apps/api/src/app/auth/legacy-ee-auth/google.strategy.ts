import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { OAuth2Strategy as Strategy } from 'passport-google-oauth';
import { Metadata, StateStoreStoreCallback, StateStoreVerifyCallback } from 'passport-oauth2';

import { AuthProviderEnum } from '@novu/shared';
import { AuthService } from '@novu/application-generic';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, AuthProviderEnum.GOOGLE) {
  constructor(private authService: AuthService) {
    super({
      clientID: process.env.GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      callbackURL: process.env.API_ROOT_URL + `/v1/auth/${AuthProviderEnum.GOOGLE}/callback`,
      state: true,
      passReqToCallback: true,
      store: {
        verify(req, state: string, meta: Metadata, callback: StateStoreVerifyCallback) {
          callback(null, true, JSON.stringify(req.query));
        },
        store(req, meta: Metadata, callback: StateStoreStoreCallback) {
          callback(null, JSON.stringify(req.query));
        },
      },
    });
  }

  async validate(req, accessToken: string, refreshToken: string, googleProfile, done: (err, data) => void) {
    try {
      const profile = { ...googleProfile._json, email: googleProfile.emails[0].value };
      const parsedState = this.parseState(req);

      const response = await this.authService.authenticate(
        AuthProviderEnum.GOOGLE,
        accessToken,
        refreshToken,
        profile,
        parsedState?.distinctId,
        parsedState?.source
      );

      done(null, {
        token: response.token,
        newUser: response.newUser,
      });
    } catch (err) {
      done(err, false);
    }
  }

  private parseState(req) {
    try {
      return JSON.parse(req.query.state);
    } catch (e) {
      return {};
    }
  }
}
