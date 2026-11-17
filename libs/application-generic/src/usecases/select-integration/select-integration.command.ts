import { ChannelTypeEnum, ITenantDefine, ITriggerPayload, ProvidersIdEnum } from '@novu/shared';
import { IsDefined, IsMongoId, IsOptional } from 'class-validator';

import { EnvironmentCommand } from '../../commands/project.command';
import type { ICompileContext } from '../../types/compile-context';
import type { WorkflowVariables } from '../../utils/build-workflow-variables';

export interface IntegrationFilterData {
  tenant?: ITenantDefine | string;
  payload?: ITriggerPayload;
  subscriber?: ICompileContext['subscriber'] | Record<string, unknown>;
  context?: ICompileContext['context'] | Record<string, unknown>;
  workflow?: WorkflowVariables;
}

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
  filterData: IntegrationFilterData;

  @IsOptional()
  userId?: string;

  /**
   * Read the channel's active integrations from the in-memory LRU cache (flag-gated). Meant for the
   * worker hot path, where a selection per subscriber per step otherwise costs two queries; leave it
   * off where an integration edit must apply immediately (e.g. dashboard test sends).
   */
  @IsOptional()
  useCache?: boolean;
}
