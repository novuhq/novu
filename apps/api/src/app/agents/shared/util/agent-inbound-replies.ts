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

export type InboundSenderAuthCheck = 'dkim' | 'spf';

/**
 * Shown when an inbound email failed a required sender check. Must not use the
 * generic identity-miss copy — that would misattribute a spoofed From as
 * "unknown user" rather than an unverified sender.
 */
export const UNRESOLVED_SUBSCRIBER_EMAIL_VERIFICATION_FAILED_REPLY = buildEmailVerificationFailedReply(undefined);

export function buildMentionRequiredNoticeReply(params: { joinerName?: string; agentName?: string }): string {
  const handle = params.agentName?.trim();
  const mentionHint = handle ? `@-mention me (${handle})` : '@-mention me';
  const joiner = params.joinerName?.trim();

  if (joiner) {
    return `I see ${joiner} joined this thread. Now that more than one person is here, ${mentionHint} when you'd like me to reply.`;
  }

  return `There's more than one person in this thread, so ${mentionHint} when you'd like me to reply.`;
}

export function buildUnresolvedSubscriberAccessReply(params: {
  platform: AgentPlatformEnum;
  senderEmail?: string;
  resolutionOutcome?: SubscriberResolutionOutcome;
  emailSenderUnverified?: boolean;
  failedSenderChecks?: readonly InboundSenderAuthCheck[];
}): string {
  // On `error` the sender's identity was never actually rejected, so the
  // access-denied copy would be wrong. (`resolved` never reaches this gate —
  // the inbound handler reclassifies resolved-but-unloadable records as
  // `error` before dispatch.)
  if (params.resolutionOutcome === 'error') {
    return UNRESOLVED_SUBSCRIBER_TRANSIENT_REPLY;
  }

  if (params.emailSenderUnverified && params.platform === AgentPlatformEnum.EMAIL) {
    return buildEmailVerificationFailedReply(params.senderEmail, params.failedSenderChecks);
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

function describeFailedSenderChecks(checks: readonly InboundSenderAuthCheck[] | undefined): string {
  const dkimFailed = checks?.includes('dkim') ?? false;
  const spfFailed = checks?.includes('spf') ?? !dkimFailed;

  if (dkimFailed && spfFailed) {
    return 'DKIM and SPF checks failed';
  }

  if (dkimFailed) {
    return 'DKIM check failed';
  }

  return 'SPF check failed';
}

function buildEmailVerificationFailedReply(
  senderEmail: string | undefined,
  checks?: readonly InboundSenderAuthCheck[]
): string {
  const from = senderEmail?.trim() || 'the address in the From header';
  const reason = describeFailedSenderChecks(checks);

  return (
    `We couldn't verify that this email really came from ${from} (${reason}), ` +
    "so this agent can't reply yet. Resend from a properly authenticated mailbox, or contact the team that owns this agent."
  );
}
