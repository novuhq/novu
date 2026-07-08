import { AgentPlatformEnum } from '../enums/agent-platform.enum';
import type { SubscriberResolutionOutcome } from '../types/subscriber-resolution';

/** Shown when an inbound turn cannot be mapped to a Novu subscriber (e.g. unknown chat sender). */
export const UNRESOLVED_SUBSCRIBER_ACCESS_REPLY =
  "You don't have access to message this agent. Connect your account through your application to continue.";

/**
 * Shown when resolution itself broke rather than the sender being unknown —
 * blaming the sender's identity for an internal failure would be misleading.
 */
export const UNRESOLVED_SUBSCRIBER_TRANSIENT_REPLY =
  "We couldn't process your message because of a temporary issue on our side. Please try again in a few minutes.";

export function buildUnresolvedSubscriberAccessReply(params: {
  platform: AgentPlatformEnum;
  senderEmail?: string;
  resolutionOutcome?: SubscriberResolutionOutcome;
}): string {
  if (isTransientResolutionOutcome(params.resolutionOutcome)) {
    return UNRESOLVED_SUBSCRIBER_TRANSIENT_REPLY;
  }

  const sender = params.senderEmail?.trim();

  if (params.platform === AgentPlatformEnum.EMAIL && sender) {
    return (
      `We couldn't verify your email (${sender}). ` +
      'Send from the email address registered with your Novu account, or sign up through your app using that same address.'
    );
  }

  return UNRESOLVED_SUBSCRIBER_ACCESS_REPLY;
}

/**
 * `error` means the lookup failed outright. `resolved` reaching the unresolved
 * gate means the id resolved but the Subscriber record could not be loaded
 * afterwards. In both cases the sender's identity was never actually rejected,
 * so the access-denied copy would be wrong.
 */
function isTransientResolutionOutcome(outcome: SubscriberResolutionOutcome | undefined): boolean {
  switch (outcome) {
    case 'error':
    case 'resolved':
      return true;
    case 'not_found':
    case 'invalid_identity':
    case undefined:
      return false;
    default: {
      const exhaustiveCheck: never = outcome;

      throw new Error(`Unhandled subscriber resolution outcome: ${exhaustiveCheck as string}`);
    }
  }
}
