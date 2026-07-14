import { AgentPlatformEnum } from '../enums/agent-platform.enum';
import type { SubscriberResolutionOutcome } from '../types/subscriber-resolution';

/** Shown when an inbound turn cannot be mapped to a Novu subscriber (e.g. unknown chat sender). */
export const UNRESOLVED_SUBSCRIBER_ACCESS_REPLY =
  "We couldn't match your identity to a known user, so this agent can't reply yet. Sign in or link your account in the app that owns this agent, then try again.";

/**
 * Shown when resolution itself broke rather than the sender being unknown —
 * blaming the sender's identity for an internal failure would be misleading.
 */
export const UNRESOLVED_SUBSCRIBER_TRANSIENT_REPLY =
  "We couldn't process your message because of a temporary issue on our side. Please try again in a few minutes.";

/**
 * Shown when an inbound email failed DKIM/SPF verification. Must not use the
 * generic identity-miss copy — that would misattribute a spoofed From as
 * "unknown user" rather than an unverified sender.
 */
export const UNRESOLVED_SUBSCRIBER_EMAIL_VERIFICATION_FAILED_REPLY = buildEmailVerificationFailedReply(undefined);

export function buildUnresolvedSubscriberAccessReply(params: {
  platform: AgentPlatformEnum;
  senderEmail?: string;
  resolutionOutcome?: SubscriberResolutionOutcome;
  emailSenderUnverified?: boolean;
}): string {
  // On `error` the sender's identity was never actually rejected, so the
  // access-denied copy would be wrong. (`resolved` never reaches this gate —
  // the inbound handler reclassifies resolved-but-unloadable records as
  // `error` before dispatch.)
  if (params.resolutionOutcome === 'error') {
    return UNRESOLVED_SUBSCRIBER_TRANSIENT_REPLY;
  }

  if (params.emailSenderUnverified && params.platform === AgentPlatformEnum.EMAIL) {
    return buildEmailVerificationFailedReply(params.senderEmail);
  }

  const sender = params.senderEmail?.trim();

  if (params.platform === AgentPlatformEnum.EMAIL && sender) {
    return (
      `We couldn't match ${sender} to a known user. ` +
      'Send from the address registered with your account, or sign up in the app that owns this agent using that same address.'
    );
  }

  return UNRESOLVED_SUBSCRIBER_ACCESS_REPLY;
}

function buildEmailVerificationFailedReply(senderEmail: string | undefined): string {
  const from = senderEmail?.trim() || 'the address in the From header';

  return (
    `We couldn't verify that this email really came from ${from} (DKIM/SPF checks failed), ` +
    "so this agent can't reply yet. Resend from a properly authenticated mailbox, or contact the team that owns this agent."
  );
}
