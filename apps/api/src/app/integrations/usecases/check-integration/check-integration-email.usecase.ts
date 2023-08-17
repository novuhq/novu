import { Injectable } from '@nestjs/common';
import { MailFactory } from '@novu/application-generic';

import { CheckIntegrationCommand } from './check-integration.command';

@Injectable()
export class CheckIntegrationEMail {
  public async execute(command: CheckIntegrationCommand) {
    const mailFactory = new MailFactory();
    const mailHandler = mailFactory.getHandler(
      {
        channel: command.channel,
        credentials: command.credentials ?? {},
        providerId: command.providerId,
      },
      command.credentials?.from
    );

    return await mailHandler.check();
  }
}
