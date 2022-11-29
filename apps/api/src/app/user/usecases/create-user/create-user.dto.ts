import { AuthProviderEnum } from '@novu/shared';
import { BaseCommand } from '../../../shared/commands/base.command';

export class CreateUserCommand extends BaseCommand {
  email: string;

  firstName: string;

  lastName: string;

  picture?: string;

  auth: {
    profileId: string;
    provider: AuthProviderEnum;
    accessToken: string;
    refreshToken: string;
  };
}
