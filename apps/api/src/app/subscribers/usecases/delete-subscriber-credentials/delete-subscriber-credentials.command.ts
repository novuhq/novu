import { IsNotEmpty, IsString } from 'class-validator';
import { ChatProviderIdEnum, PushProviderIdEnum } from '@novu/shared';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class DeleteSubscriberCredentialsCommand extends EnvironmentCommand {
  @IsString()
  @IsNotEmpty()
  subscriberId: string;

  @IsString()
  @IsNotEmpty()
  providerId: string;
}
