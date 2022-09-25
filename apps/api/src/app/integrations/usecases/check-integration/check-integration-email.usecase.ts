import { Injectable } from '@nestjs/common';
import { MailFactory } from '../../../events/services/mail-service/mail.factory';
import { CheckIntegrationCommand } from './check-integration.command';

@Injectable()
export class CheckIntegrationEMail {
  private mailFactory = new MailFactory();

  public async execute(command: CheckIntegrationCommand) {
    const mailHandler = this.mailFactory.getHandler(
      {
        channel: command.channel,
        credentials: command.credentials,
        providerId: command.providerId,
      },
      command.credentials.from
    );

    return await mailHandler.check();
  }
}
