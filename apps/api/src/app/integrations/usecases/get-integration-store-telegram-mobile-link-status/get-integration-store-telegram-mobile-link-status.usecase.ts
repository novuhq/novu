import { Injectable } from '@nestjs/common';

import {
  InvalidTelegramMobileTokenError,
  TelegramMobileLinkTokenService,
} from '../../../agents/services/telegram-mobile-link-token.service';
import { GetIntegrationStoreTelegramMobileLinkStatusCommand } from './get-integration-store-telegram-mobile-link-status.command';

export interface GetIntegrationStoreTelegramMobileLinkStatusResultValid {
  valid: true;
  providerName: 'telegram';
}

export interface GetIntegrationStoreTelegramMobileLinkStatusResultInvalid {
  valid: false;
  reason: 'expired' | 'used' | 'invalid';
}

export type GetIntegrationStoreTelegramMobileLinkStatusResult =
  | GetIntegrationStoreTelegramMobileLinkStatusResultValid
  | GetIntegrationStoreTelegramMobileLinkStatusResultInvalid;

@Injectable()
export class GetIntegrationStoreTelegramMobileLinkStatus {
  constructor(private readonly tokenService: TelegramMobileLinkTokenService) {}

  async execute(
    command: GetIntegrationStoreTelegramMobileLinkStatusCommand
  ): Promise<GetIntegrationStoreTelegramMobileLinkStatusResult> {
    let payload: ReturnType<TelegramMobileLinkTokenService['verifyIntegrationStore']>;
    try {
      payload = this.tokenService.verifyIntegrationStore(command.token);
    } catch (err) {
      if (err instanceof InvalidTelegramMobileTokenError) {
        return { valid: false, reason: err.reason };
      }

      return { valid: false, reason: 'invalid' };
    }

    if (await this.tokenService.isJtiUsed(payload.jti)) {
      return { valid: false, reason: 'used' };
    }

    return { valid: true, providerName: 'telegram' };
  }
}
