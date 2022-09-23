import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { IsOptional } from 'class-validator';
import {
  ChannelTypeEnum,
  EmailProviderIdEnum,
  PushProviderIdEnum,
  SmsProviderIdEnum,
  InAppProviderIdEnum,
  ChatProviderIdEnum,
} from '@novu/shared';

export class GetDecryptedIntegrationsCommand extends EnvironmentCommand {
  @IsOptional()
  findOne?: boolean;

  @IsOptional()
  active?: boolean;

  @IsOptional()
  channelType?: ChannelTypeEnum;

  @IsOptional()
  providerId?: EmailProviderIdEnum | SmsProviderIdEnum | PushProviderIdEnum | ChatProviderIdEnum | InAppProviderIdEnum;
}
