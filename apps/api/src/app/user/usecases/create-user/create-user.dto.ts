import { AuthProviderEnum } from '@notifire/shared';
import { CommandHelper } from '../../../shared/commands/command.helper';

export class CreateUserCommand {
  static create(data: CreateUserCommand) {
    return CommandHelper.create(CreateUserCommand, data);
  }

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
