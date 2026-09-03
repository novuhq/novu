import { EnvironmentWithUserCommand, type ICompileContext } from '@novu/application-generic';
import { ChannelTypeEnum, ITenantDefine } from '@novu/shared';
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
   * Same shape as `SelectIntegrationCommand.filterData`. Only `subscriber` and `context`
   * feed integration rule evaluation; `tenant` is reachable through `context.tenant`.
   */
  @IsDefined()
  @IsObject()
  filterData: {
    tenant?: ITenantDefine | string;
    subscriber?: ICompileContext['subscriber'] | Record<string, unknown>;
    context?: ICompileContext['context'] | Record<string, unknown>;
  };
}
