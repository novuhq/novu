import { AgentPlatformEnum } from '../enums/agent-platform.enum';

/** Shown when an inbound turn cannot be mapped to a Novu subscriber (e.g. unknown chat sender). */
export const UNRESOLVED_SUBSCRIBER_ACCESS_REPLY =
  "You don't have access to message this agent. Connect your account through your application to continue.";

export function buildUnresolvedSubscriberAccessReply(params: {
  platform: AgentPlatformEnum;
  senderEmail?: string;
}): string {
  const sender = params.senderEmail?.trim();

  if (params.platform === AgentPlatformEnum.EMAIL && sender) {
    return (
      `We couldn't verify your email (${sender}). ` +
      'Send from the email address registered with your Novu account, or sign up through your app using that same address.'
    );
  }

  return UNRESOLVED_SUBSCRIBER_ACCESS_REPLY;
}
