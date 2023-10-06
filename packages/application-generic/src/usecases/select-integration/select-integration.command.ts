import { IsDefined, IsMongoId, IsOptional } from 'class-validator';
import { ChannelTypeEnum, ITenantDefine, ProvidersIdEnum } from '@novu/shared';

import { EnvironmentWithUserCommand } from '../../commands/project.command';

export class SelectIntegrationCommand extends EnvironmentWithUserCommand {
  @IsOptional()
  @IsMongoId()
  id?: string;

  @IsOptional()
  identifier?: string;

  @IsDefined()
  channelType: ChannelTypeEnum;

  @IsOptional()
  providerId?: ProvidersIdEnum;

  @IsDefined()
  filterData: {
    tenant?: ITenantDefine;
  };
}
