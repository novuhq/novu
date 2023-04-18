import { IsOptional } from 'class-validator';
import {
  ChannelTypeEnum,
  EmailProviderIdEnum,
  PushProviderIdEnum,
  SmsProviderIdEnum,
  InAppProviderIdEnum,
  ChatProviderIdEnum,
} from '@novu/shared';

import { EnvironmentWithUserCommand } from '../../commands/project.command';

export class GetDecryptedIntegrationsCommand extends EnvironmentWithUserCommand {
  @IsOptional()
  findOne?: boolean;

  @IsOptional()
  active?: boolean;

  @IsOptional()
  channelType?: ChannelTypeEnum;

  @IsOptional()
  providerId?:
    | EmailProviderIdEnum
    | SmsProviderIdEnum
    | PushProviderIdEnum
    | ChatProviderIdEnum
    | InAppProviderIdEnum;
}
