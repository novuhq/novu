import { HeaderAPIKeyStrategy } from 'passport-headerapikey';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, Logger } from '@nestjs/common';
import { AuthService } from '@novu/application-generic';
import { IJwtPayload } from '@novu/shared';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(HeaderAPIKeyStrategy) {
  constructor(private readonly authService: AuthService) {
    super(
      { header: 'Authorization', prefix: 'ApiKey ' },
      true,
      (apikey: string, verified: (err: Error | null, user?: IJwtPayload | false) => void) => {
        Logger.log('ApiKeyStrategy validate');
        this.authService.validateApiKey(apikey).then((user) => {
          if (!user) {
            return verified(null, false);
          }

          return verified(null, user);
        });
      }
    );
  }
}
