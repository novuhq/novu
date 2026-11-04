import { BadRequestException } from '@nestjs/common';
import { type InboundSenderAuthInput, resolveInboundSenderAuth } from '@novu/shared';

export function mergeInboundSenderAuth(
  stored: InboundSenderAuthInput | undefined,
  patch: InboundSenderAuthInput
): InboundSenderAuthInput {
  const next: InboundSenderAuthInput = { ...(stored ?? {}) };

  if (patch.dkim !== undefined) {
    next.dkim = patch.dkim;
  }

  if (patch.spf !== undefined) {
    next.spf = patch.spf;
  }

  return next;
}

export function assertSenderAuthRequiresACheck(stored: InboundSenderAuthInput): void {
  const resolved = resolveInboundSenderAuth(stored);

  if (!resolved.dkim && !resolved.spf) {
    throw new BadRequestException('A domain must require at least one of DKIM or SPF.');
  }
}
