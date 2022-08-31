import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { IsOptional } from 'class-validator';
import { ChannelTypeEnum } from '@novu/stateless';

export class GetDecryptedIntegrationsCommand extends EnvironmentCommand {
  @IsOptional()
  active?: boolean;

  @IsOptional()
  channelType?: ChannelTypeEnum;
}
