import { IsArray, IsEnum, IsMongoId, IsNumber, IsOptional, IsString } from 'class-validator';
import { ChannelTypeEnum } from '@novu/shared';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GetActivityFeedCommand extends EnvironmentWithUserCommand {
  @IsNumber()
  @IsOptional()
  page: number;

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

  @IsOptional()
  @IsString()
  transactionId?: string;
}
