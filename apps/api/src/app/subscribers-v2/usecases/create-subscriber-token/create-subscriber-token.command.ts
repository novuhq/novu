import { ContextPayload } from '@novu/shared';
import { IsDefined, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { SubscriberLoginProfile, SubscriberTokenScopeEnum } from '../../../shared/services/subscriber-login-token';

export class CreateSubscriberTokenCommand extends EnvironmentCommand {
  @IsString()
  @IsDefined()
  subscriberId: string;

  context?: ContextPayload;

  subscriber?: SubscriberLoginProfile;

  scope?: SubscriberTokenScopeEnum[];

  expiresIn?: number;
}
