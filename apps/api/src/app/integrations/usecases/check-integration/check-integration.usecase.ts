import { Injectable } from '@nestjs/common';
import { CheckIntegrationEMail } from './check-integration-email.usecase';
import { CheckIntegrationCommand } from './check-integration.command';
import { ChannelTypeEnum, ICredentialsDto } from '@novu/shared';

@Injectable()
export class CheckIntegration {
  constructor(private checkIntegrationEmail: CheckIntegrationEMail) {}

  public async execute(command: CheckIntegrationCommand) {
    switch (command.channel) {
      case ChannelTypeEnum.EMAIL:
        return await this.checkIntegrationEmail.execute(command);
    }
  }
}
