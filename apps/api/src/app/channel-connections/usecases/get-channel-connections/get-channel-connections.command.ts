import { ChannelTypeEnum, ProvidersIdEnum, ProvidersIdEnumConst, ResourceKey } from '@novu/shared';
import { IsDefined, IsEnum, IsOptional, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class GetChannelConnectionsCommand extends EnvironmentCommand {
  @IsDefined()
  @IsString()
  resource: ResourceKey;

  @IsEnum(ChannelTypeEnum)
  @IsOptional()
  channel?: ChannelTypeEnum;

  @IsEnum(ProvidersIdEnumConst)
  @IsOptional()
  provider?: ProvidersIdEnum;
}
