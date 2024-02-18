import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CheckIntegrationEMail } from './check-integration-email.usecase';
import { CheckIntegrationCommand } from './check-integration.command';
import { ChannelTypeEnum } from '@novu/shared';

@Injectable()
export class CheckIntegration {
  constructor(private checkIntegrationEmail: CheckIntegrationEMail) {}

  public async execute(command: CheckIntegrationCommand) {
    try {
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

      throw e;
    }
  }
}
