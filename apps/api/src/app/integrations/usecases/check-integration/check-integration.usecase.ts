import { Injectable } from '@nestjs/common';
import { ChannelTypeEnum, ICredentialsDto } from '@novu/shared';
import { CheckIntegrationEMail } from './check-integration-email.usecase';
import { CheckIntegrationCommand } from './check-integration.command';

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
