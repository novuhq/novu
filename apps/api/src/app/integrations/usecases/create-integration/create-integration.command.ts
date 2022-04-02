import { IsDefined } from 'class-validator';
import { ChannelTypeEnum, ICredentialsDto } from '@novu/shared';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { ApplicationCommand } from '../../../shared/commands/project.command';

export class CreateIntegrationCommand extends ApplicationCommand {
  static create(data: CreateIntegrationCommand) {
    return CommandHelper.create(CreateIntegrationCommand, data);
  }

  @IsDefined()
  providerId: string;

  @IsDefined()
  channel: ChannelTypeEnum;

  @IsDefined()
  credentials: ICredentialsDto;

  @IsDefined()
  active: boolean;
}
