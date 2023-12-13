import { HeaderAPIKeyStrategy } from 'passport-headerapikey';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { AuthService } from '@novu/application-generic';
import { ApiAuthSchemeEnum, IJwtPayload } from '@novu/shared';
import { HttpRequestHeaderKeysEnum } from '../../../shared/framework/types';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(HeaderAPIKeyStrategy) {
  constructor(private readonly authService: AuthService) {
    super(
      { header: HttpRequestHeaderKeysEnum.AUTHORIZATION, prefix: `${ApiAuthSchemeEnum.API_KEY} ` },
      true,
      (apikey: string, verified: (err: Error | null, user?: IJwtPayload | false) => void) => {
        this.authService
          .validateApiKey(apikey)
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
