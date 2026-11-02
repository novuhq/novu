import type { ReactNode } from 'react';

import { APP_LABELS, AppIcon } from '@/components/invite/app-icon';
import { CardText } from '@/components/invite/invite-card';
import { MascotFace } from '@/components/ui/mascot-face';
import type { InviteChannelVia } from '@/lib/invite-api';

type DoneCardProps = {
  agentName: string;
  inviteeName: string;
  /** The app shown in the example message. */
  via: InviteChannelVia;
  /** Whether asks go to that app by default. */
  isDefault: boolean;
  telegramBot?: string;
  /** Back to the list of apps, to connect another one or change the default. */
  onBack: () => void;
};

export function DoneCard({ agentName, inviteeName, via, isDefault, telegramBot, onBack }: DoneCardProps) {
  const firstName = inviteeName.trim().split(/\s+/)[0];
  const sender = via === 'telegram' && telegramBot ? `@${telegramBot}` : APP_LABELS[via];

  return (
    <>
      <MascotFace art="waiting" mood="happy" className="size-35" />
      <h1 className="text-2xl leading-7.5 tracking-[-0.02em]">
        You&apos;re in{firstName && ', '}
        {firstName && <Accent>{firstName}</Accent>}
      </h1>
      <CardText>
        When {agentName} needs you{isDefault && ` on ${APP_LABELS[via]}`}, it looks like this:
      </CardText>

      <figure
        aria-label="Example message"
        className="flex flex-col gap-2.5 rounded-lg border border-border bg-subtle p-4"
      >
        <figcaption className="flex items-center gap-2 font-mono text-[11px] leading-4 text-muted">
          <AppIcon via={via} size="small" />
          {sender}
        </figcaption>
        <p className="text-[13px] leading-4.5">Your September invoice is ready. Want it as a PDF?</p>
        {/* A picture of the buttons in the chat app, not something to press here. */}
        <div aria-hidden="true" className="flex gap-2 text-[13px] leading-4.5 font-medium select-none">
          <span className="flex h-7 items-center rounded bg-accent px-2.5 text-background">Approve</span>
          <span className="flex h-7 items-center rounded bg-background px-2.5 ring-1 ring-border ring-inset">Deny</span>
        </div>
      </figure>

      <p className="text-xs leading-4 text-muted">
        You can close this tab, or{' '}
        <button
          type="button"
          className="cursor-pointer rounded-sm text-secondary underline underline-offset-4 transition-colors duration-150 hover:text-foreground motion-reduce:transition-none"
          onClick={onBack}
        >
          go back to your apps
        </button>
        .
      </p>
    </>
  );
}

/** The accent word of a heading, in the italic display face. */
function Accent({ children }: { children: ReactNode }) {
  return <em className="font-display text-[26px] tracking-[-0.75px] text-accent">{children}</em>;
}
