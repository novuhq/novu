import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InstrumentUsecase, PinoLogger } from '@novu/application-generic';

import type { WhatsAppEmbeddedSignupResponseDto } from '../../dtos/whatsapp-embedded-signup.dto';
import {
  type ClaimedWhatsAppSignupLink,
  InvalidWhatsAppSignupLinkTokenError,
  WhatsAppSignupLinkTokenService,
} from '../../whatsapp-signup-link-token.service';
import { CompleteWhatsAppSignupLinkCommand } from './complete-whatsapp-signup-link.command';
import { WhatsAppEmbeddedSignupCommand } from './whatsapp-embedded-signup.command';
import { WhatsAppEmbeddedSignup } from './whatsapp-embedded-signup.usecase';

/**
 * Sentinel userId attributed to credential updates performed via the public
 * tokenized signup page. Tracked by analytics in {@link UpdateIntegration}
 * but never used as a real Novu user.
 */
const SYNTHETIC_USER_ID = 'whatsapp-signup-link';

/**
 * Completes Meta Embedded Signup from the public tokenized page. The visitor
 * is unauthenticated; trust comes from the opaque Redis-backed signup token
 * minted via `POST /v1/integrations/whatsapp/signup-link`. The token is
 * claimed single-use up front and released again when the completion fails,
 * so the visitor can retry the same link.
 */
@Injectable()
export class CompleteWhatsAppSignupLink {
  constructor(
    private readonly tokenService: WhatsAppSignupLinkTokenService,
    private readonly embeddedSignupUsecase: WhatsAppEmbeddedSignup,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: CompleteWhatsAppSignupLinkCommand): Promise<WhatsAppEmbeddedSignupResponseDto> {
    const claimed = await this.claimToken(command.token);
    const { payload } = claimed;

    let result: WhatsAppEmbeddedSignupResponseDto;
    try {
      result = await this.embeddedSignupUsecase.execute(
        WhatsAppEmbeddedSignupCommand.create({
          userId: SYNTHETIC_USER_ID,
          environmentId: payload.env,
          organizationId: payload.org,
          code: command.code,
          wabaId: command.wabaId,
          phoneNumberId: command.phoneNumberId,
          integrationIdentifier: payload.iid,
          agentIdentifier: payload.aid,
        })
      );
    } catch (err) {
      await this.releaseToken(command.token, claimed);

      throw err;
    }

    if (!result.success) {
      await this.releaseToken(command.token, claimed);
    }

    return result;
  }

  private async claimToken(token: string): Promise<ClaimedWhatsAppSignupLink> {
    try {
      return await this.tokenService.claim(token);
    } catch (err) {
      if (err instanceof InvalidWhatsAppSignupLinkTokenError) {
        if (err.reason === 'used') {
          throw new ConflictException({
            code: 'token_already_used',
            message: 'This signup link has already been used. Re-run `npx novu connect` to get a new one.',
          });
        }

        throw new UnauthorizedException({
          code: err.reason === 'expired' ? 'token_expired' : 'token_invalid',
          message:
            err.reason === 'expired'
              ? 'This signup link has expired. Re-run `npx novu connect` to get a new one.'
              : 'This signup link is invalid.',
        });
      }

      throw err;
    }
  }

  private async releaseToken(token: string, claimed: ClaimedWhatsAppSignupLink): Promise<void> {
    try {
      await this.tokenService.release(token, claimed);
    } catch (releaseErr) {
      this.logger.error({ err: releaseErr }, 'Failed to release WhatsApp signup link token after failed completion');
    }
  }
}
