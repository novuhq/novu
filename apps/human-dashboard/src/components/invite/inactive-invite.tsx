import { CardText, StepTitle } from '@/components/invite/invite-card';

export type InactiveReason = 'expired' | 'declined' | 'invalid';

/** The invite is over: the link ran out, they said no, or it never named a real invite. */
export function InactiveInvite({ reason, agentName }: { reason: InactiveReason; agentName?: string }) {
  const { title, text } = inactiveCopy(reason, agentName);

  return (
    <>
      <img src="/illustrations/state-error.svg" alt="" width={120} height={120} className="size-30" />
      <StepTitle>{title}</StepTitle>
      <CardText>{text}</CardText>
    </>
  );
}

function inactiveCopy(reason: InactiveReason, agentName?: string): { title: string; text: string } {
  switch (reason) {
    case 'declined':
      return {
        title: 'Invite declined',
        text: `${agentName ?? 'The agent'} won't contact you through this link. You can close this tab.`,
      };
    case 'expired':
      return {
        title: 'This invite has expired',
        text: 'Invite links last 3 days. Ask the person who invited you for a new one.',
      };
    default:
      return {
        title: "This link isn't valid",
        text: 'It may be incomplete or already replaced. Ask the person who invited you for a new one.',
      };
  }
}
