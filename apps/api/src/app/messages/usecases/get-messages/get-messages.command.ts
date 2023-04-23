import { ChannelTypeEnum } from '@novu/shared';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { Transform } from 'class-transformer';

export class GetMessagesCommand extends EnvironmentCommand {
  @IsNumber()
  @IsOptional()
  page: number;

  @IsOptional()
  subscriberId?: string;

  @IsOptional()
  channel?: ChannelTypeEnum;

  @IsNumber()
  limit: number;
}
