import { ChannelTypeEnum, ITenantDefine, ProvidersIdEnum } from '@novu/shared';
import { IsBoolean, IsDefined, IsMongoId, IsOptional } from 'class-validator';

import { EnvironmentCommand } from '../../commands/project.command';
import type { ICompileContext } from '../../types/compile-context';

export class SelectIntegrationCommand extends EnvironmentCommand {
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
    tenant?: ITenantDefine | string;
    subscriber?: ICompileContext['subscriber'] | Record<string, unknown>;
    context?: ICompileContext['context'] | Record<string, unknown>;
  };

  @IsOptional()
  userId?: string;

  /**
   * Set by callers asking "does this environment have an active integration for this channel"
   * rather than "which integration should deliver this notification". Those lookups are
   * configuration reads, so integration `rules` must not exclude the result.
   */
  @IsOptional()
  @IsBoolean()
  ignoreRules?: boolean;
}
