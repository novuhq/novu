import { IsArray, IsEnum, IsMongoId, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { ChannelTypeEnum } from '@novu/shared';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GetActivityFeedCommand extends EnvironmentWithUserCommand {
  static create(data: GetActivityFeedCommand) {
    return CommandHelper.create<GetActivityFeedCommand>(GetActivityFeedCommand, data);
  }

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
}
