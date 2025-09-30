import { ChannelTypeEnum } from '@novu/shared';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class RemoveMessagesByTransactionIdCommand extends EnvironmentCommand {
  @IsString()
  transactionId: string;

  @IsEnum(ChannelTypeEnum)
  @IsOptional()
  channel?: ChannelTypeEnum;
}
