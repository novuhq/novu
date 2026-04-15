import { BadRequestException } from '@nestjs/common';
import { ConnectionMode, ContextPayload } from '@novu/shared';

/**
 * Validates that the subscriber/context combination is consistent with the
 * requested connectionMode. Throws a BadRequestException when the caller
 * violates the scoping rules for the chosen mode.
 *
 * Note: subscriberId may be present even in "shared" mode (e.g. injected from
 * the subscriber JWT session). It is intentionally not rejected here — callers
 * are responsible for stripping it before storing or embedding it in state.
 *
 * Called from both CreateChannelConnection and GenerateSlackOauthUrl so the
 * rules are enforced in one place.
 */
export function validateConnectionMode({
  connectionMode,
  subscriberId,
  context,
}: {
  connectionMode?: ConnectionMode;
  subscriberId?: string;
  context?: ContextPayload;
}): void {
  if (connectionMode === 'shared') {
    if (!context) {
      throw new BadRequestException('context is required when connectionMode is "shared"');
    }

    return;
  }

  if (connectionMode === 'subscriber') {
    if (!subscriberId) {
      throw new BadRequestException('subscriberId is required when connectionMode is "subscriber"');
    }

    return;
  }

  if (!subscriberId && !context) {
    throw new BadRequestException('Either subscriberId or context must be provided');
  }
}
