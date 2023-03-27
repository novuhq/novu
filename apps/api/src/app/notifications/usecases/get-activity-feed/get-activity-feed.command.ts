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
  channels?: ChannelTypeEnum[] | null;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  templates?: string[] | null;

  @IsOptional()
  @IsArray()
  emails?: string[] | null;

  @IsOptional()
  @IsString()
  search?: string | null;

  @IsOptional()
  @IsString()
  transactionId?: string;
}
