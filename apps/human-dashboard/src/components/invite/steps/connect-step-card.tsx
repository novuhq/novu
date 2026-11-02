import type { ReactNode } from 'react';

import { AppIcon } from '@/components/invite/app-icon';
import { CardText, InviteCard, InviterLine, StepTitle } from '@/components/invite/invite-card';
import { Button, SMALL_BUTTON } from '@/components/ui/button';
import type { ActiveInviteStatus, InviteChannelVia } from '@/lib/invite-api';
import { cn } from '@/lib/utils';

type ConnectStepCardProps = {
  via: InviteChannelVia;
  status: ActiveInviteStatus;
  title: ReactNode;
  description: ReactNode;
  /** Whatever the last request said went wrong, already rendered. */
  error: ReactNode;
  onBack: () => void;
  /** The controls that are this channel's own: a form, a QR code, a sign-in button. */
  children: ReactNode;
};

/**
 * The frame every connect step shares: who is asking, the app's mark, what to do, then the step's own
 * controls, anything that went wrong, and the way back to the list of apps.
 */
export function ConnectStepCard({ via, status, title, description, error, onBack, children }: ConnectStepCardProps) {
  return (
    <InviteCard step={via}>
      <InviterLine name={status.inviterName} agentPictureUrl={status.agentPictureUrl} />
      <AppIcon via={via} size="large" />
      <StepTitle>{title}</StepTitle>
      <CardText>{description}</CardText>
      {children}
      {error}
      <Button variant="secondary" className={cn(SMALL_BUTTON, 'self-start')} onClick={onBack}>
        Choose another way
      </Button>
    </InviteCard>
  );
}
