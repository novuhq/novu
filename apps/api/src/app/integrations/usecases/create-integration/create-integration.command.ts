import { IsDefined } from 'class-validator';
import { ChannelTypeEnum } from '@notifire/shared';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { ApplicationCommand } from '../../../shared/commands/project.command';
import { CredentialsDto } from '../../dto/create-integration.dto';

export class CreateIntegrationCommand extends ApplicationCommand {
  static create(data: CreateIntegrationCommand) {
    return CommandHelper.create(CreateIntegrationCommand, data);
  }

  @IsDefined()
  providerId: string;

  @IsDefined()
  channel: ChannelTypeEnum;

  @IsDefined()
  credentials: CredentialsDto;

  @IsDefined()
  active: boolean;
}
