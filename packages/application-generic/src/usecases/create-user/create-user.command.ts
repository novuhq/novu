import { AuthProviderEnum } from '@novu/shared';
import { BaseCommand } from '../../commands';

export class CreateUserCommand extends BaseCommand {
  email: string;

  firstName?: string | null;

  lastName?: string | null;

  picture?: string;

  auth: {
    username?: string;
    profileId: string;
    provider: AuthProviderEnum;
    accessToken: string;
    refreshToken: string;
  };
}
