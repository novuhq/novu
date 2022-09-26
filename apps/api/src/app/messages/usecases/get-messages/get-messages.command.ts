import { ChannelTypeEnum } from '@novu/shared';
import { IsNumber, IsOptional } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class GetMessagesCommand extends EnvironmentCommand {
  @IsNumber()
  @IsOptional()
  page: number;

  @IsOptional()
  subscriberId?: string;

  @IsOptional()
  channel?: ChannelTypeEnum;

  @IsNumber()
  @IsOptional()
  limit?: number;
}
