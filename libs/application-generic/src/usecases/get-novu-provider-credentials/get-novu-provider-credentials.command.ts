import { ActionIntegrationTypeEnum, ChannelTypeEnum, IntegrationCategoryType } from '@novu/shared';
import { IsEnum, IsOptional, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../commands/project.command';

export class GetNovuProviderCredentialsCommand extends EnvironmentWithUserCommand {
  @IsEnum({ ...ChannelTypeEnum, ...ActionIntegrationTypeEnum })
  channelType: IntegrationCategoryType;

  @IsString()
  providerId: string;

  @IsOptional()
  @IsString()
  recipientEmail?: string;
}
