import { BadRequestException, ConflictException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  ConnectClaimTokenCacheUnavailableError,
  ConnectClaimTokenService,
} from '../../../connect/services/connect-claim-token.service';
import { isKeylessOrganization } from '../../../keyless/keyless-organization.helpers';
import type { KeylessClaimTokenResponseDto } from '../../dtos/keyless-claim-token.dto';
import { GetKeylessClaimTokenCommand } from './get-keyless-claim-token.command';

/** Machine-readable code on the 409, so `@novu/human` logs in without trying to claim again. */
export const KEYLESS_SETUP_CLAIMED_CODE = 'keyless_setup_claimed';

/**
 * The claim token of a keyless setup, so `human login` can move that setup into the Human account the
 * operator signs in with. The keyless credential already controls the setup, so this exposes nothing new;
 * it's the same token the "free messages used" link carries.
 */
@Injectable()
export class GetKeylessClaimToken {
  constructor(private readonly connectClaimTokenService: ConnectClaimTokenService) {}

  async execute(command: GetKeylessClaimTokenCommand): Promise<KeylessClaimTokenResponseDto> {
    if (!isKeylessOrganization(command.organizationId)) {
      throw new BadRequestException('Only a setup made without an account can be claimed.');
    }

    if (await this.connectClaimTokenService.isEnvironmentClaimed(command.environmentId)) {
      throw new ConflictException({
        message: 'This setup was already moved into an account.',
        code: KEYLESS_SETUP_CLAIMED_CODE,
      });
    }

    try {
      const { token } = await this.connectClaimTokenService.issueOrGetForEnvironment({
        env: command.environmentId,
        org: command.organizationId,
      });

      return { token };
    } catch (error) {
      if (error instanceof ConnectClaimTokenCacheUnavailableError) {
        throw new ServiceUnavailableException('Claiming is temporarily unavailable. Please try again.');
      }

      throw error;
    }
  }
}
