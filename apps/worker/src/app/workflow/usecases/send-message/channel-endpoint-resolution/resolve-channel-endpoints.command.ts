import { EnvironmentWithUserCommand, type IntegrationFilterData } from '@novu/application-generic';
import { ChannelTypeEnum } from '@novu/shared';
import { IsArray, IsDefined, IsEnum, IsObject, IsString } from 'class-validator';

export class ResolveChannelEndpointsCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsString()
  subscriberId: string;

  @IsDefined()
  @IsEnum(ChannelTypeEnum)
  channelType: ChannelTypeEnum;

  @IsArray()
  @IsString({ each: true })
  contextKeys: string[];

  /**
   * Same shape as `SelectIntegrationCommand.filterData`. `tenant` is reachable through
   * `context.tenant`.
   */
  @IsDefined()
  @IsObject()
  filterData: IntegrationFilterData;
}
