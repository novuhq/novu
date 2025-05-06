import { BadRequestException, Injectable } from '@nestjs/common';
import { ChannelTypeEnum } from '@novu/shared';
import { CheckIntegrationEMail } from './check-integration-email.usecase';
import { CheckIntegrationCommand } from './check-integration.command';

@Injectable()
export class CheckIntegration {
  constructor(private checkIntegrationEmail: CheckIntegrationEMail) {}

  public async execute(command: CheckIntegrationCommand) {
    try {
      // eslint-disable-next-line default-case
      switch (command.channel) {
        case ChannelTypeEnum.EMAIL:
          return await this.checkIntegrationEmail.execute(command);
      }
    } catch (e) {
      if (e.message?.includes('getaddrinfo ENOTFOUND')) {
        throw new BadRequestException(
          `Provider gateway can't resolve the host with the given hostname ${command.credentials?.host || ''}`
        );
      }

      throw new BadRequestException(e.message);
    }
  }
}
