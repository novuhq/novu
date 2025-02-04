import { HeaderAPIKeyStrategy } from 'passport-headerapikey';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { HttpRequestHeaderKeysEnum } from '@novu/application-generic';
import { ApiAuthSchemeEnum, UserSessionData } from '@novu/shared';
import { AuthService } from '../auth.service';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(HeaderAPIKeyStrategy) {
  constructor(private readonly authService: AuthService) {
    super(
      { header: HttpRequestHeaderKeysEnum.AUTHORIZATION, prefix: `${ApiAuthSchemeEnum.API_KEY} ` },
      true,
      (apikey: string, verified: (err: Error | null, user?: UserSessionData | false) => void) => {
        this.authService
          .getUserByApiKey(apikey)
          .then((user) => {
            if (!user) {
              return verified(null, false);
            }

            return verified(null, user);
          })
          .catch((err) => verified(err, false));
      }
    );
  }
}
