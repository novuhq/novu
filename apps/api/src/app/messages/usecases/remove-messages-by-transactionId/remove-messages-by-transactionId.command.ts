import { ChannelTypeEnum } from '@novu/shared';
import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { IsString, IsOptional, IsEnum } from 'class-validator';

export class RemoveMessagesByTransactionIdCommand extends EnvironmentCommand {
  @IsString()
  transactionId: string;

  @IsEnum(ChannelTypeEnum)
  @IsOptional()
  channel?: ChannelTypeEnum;
}
