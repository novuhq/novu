import { IsNotEmpty, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { ChatProviderIdEnum, PushProviderIdEnum } from '@novu/shared';

export class DeleteSubscriberCredentialsCommand extends EnvironmentCommand {
  @IsString()
  @IsNotEmpty()
  subscriberId: string;

  @IsString()
  @IsNotEmpty()
  providerId: string;
}
