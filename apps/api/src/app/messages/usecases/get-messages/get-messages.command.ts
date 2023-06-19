import { ChannelTypeEnum } from '@novu/shared';
import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class GetMessagesCommand extends EnvironmentCommand {
  @IsOptional()
  subscriberId: string;

  @IsOptional()
  channel: ChannelTypeEnum;

  @IsNumber()
  @IsOptional()
  page: number;

  @IsNumber()
  @IsOptional()
  limit: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  transactionId?: string[] | null;
}
