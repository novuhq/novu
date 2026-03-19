import { EnvironmentWithUserCommand } from '@novu/application-generic';
import { ChannelTypeEnum } from '@novu/shared';
import { IsArray, IsDefined, IsEnum, IsOptional, IsString } from 'class-validator';

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
}
