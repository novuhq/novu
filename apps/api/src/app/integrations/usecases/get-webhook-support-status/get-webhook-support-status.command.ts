import { IsDefined, IsString } from 'class-validator';
import { ChannelTypeEnum } from '@novu/shared';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GetWebhookSupportStatusCommand extends EnvironmentWithUserCommand {
  @IsString()
  providerId: string;

  @IsDefined()
  channel: ChannelTypeEnum.EMAIL | ChannelTypeEnum.SMS;
}
