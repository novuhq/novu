import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { IsArray, IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';
import { ChannelTypeEnum } from '@novu/shared';

export class GetActivityStatsCommand extends EnvironmentWithUserCommand {
  @IsOptional()
  @IsEnum(ChannelTypeEnum, {
    each: true,
  })
  channels?: ChannelTypeEnum[];

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  templates?: string[];

  @IsOptional()
  @IsArray()
  emails?: string[];

  @IsOptional()
  @IsString()
  search?: string;
}
