import { ChannelTypeEnum } from '@novu/shared';
import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class GetMessagesCommand extends EnvironmentCommand {
  @IsOptional()
  subscriberId?: string;

  @IsOptional()
  channel?: ChannelTypeEnum;

  @IsNumber()
  page = 0;

  @IsNumber()
  limit = 10;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  transactionIds?: string[] | undefined;
}
