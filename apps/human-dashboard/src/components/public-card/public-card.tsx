'use client';

import type { ReactNode } from 'react';

import { CardName, CardPortrait } from '@/components/agent-card/card-parts';
import { CopyButton } from '@/components/ui/copy-button';
import type { ChannelVia } from '@/lib/human-channels-api';
import { writtenLink } from '@/lib/onboarding';
import type { PublicAgentCard } from '@/lib/public-agent-card';

import { ChannelMark } from './channel-mark';
import { TiltCard } from './tilt-card';

/**
 * The agent's public card (`Agent ID card` on `4 · Public card · visitor view`): the Configure page's card,
 * with a line for each way to reach the agent and its link with a copy button. It rises in once the page has
 * loaded, and leans towards the pointer with a glare across it and its edge lit (`TiltCard`).
 */
export function PublicCard({ card }: { card: PublicAgentCard }) {
  return (
    <div className="w-full animate-rise-in motion-reduce:animate-none">
      <TiltCard
        aria-label={`${card.name}’s card`}
        className="w-full overflow-hidden rounded-[14px] border border-border-strong bg-background"
      >
        <CardPortrait
          handle={card.handle}
          address={card.address}
          pictureUrl={card.pictureUrl ?? undefined}
          state={card.status}
        />

        <CardName name={card.name} operatorName={card.operatorName} createdAt={card.issuedAt} />

        <ul className="flex flex-col gap-3 p-3">
          <ReachLine via="email">{card.address}</ReachLine>
          {card.telegramBot && <ReachLine via="telegram">{card.telegramBot}</ReachLine>}
        </ul>

        <div className="flex items-center gap-2 border-t border-border bg-subtle/90 px-3.5 py-3">
          <p className="min-w-0 flex-1 truncate font-mono text-xs leading-4 text-default">
            {writtenLink(card.cardLink)}
          </p>
          <CopyButton
            value={card.cardLink}
            label="Copy the link to the card"
            variant="secondary"
            className="size-7 px-0"
            iconClassName="size-3.25"
          />
        </div>
      </TiltCard>
    </div>
  );
}

/**
 * One way to reach the agent on the public card: the channel's logo and where to find the agent there, with
 * nothing to press. The design draws these lines at 113%, hence their sizes.
 */
function ReachLine({ via, children }: { via: ChannelVia; children: ReactNode }) {
  return (
    <li className="flex h-4 items-center gap-[9.043px]">
      <ChannelMark via={via} size="line" />
      <span className="min-w-0 flex-1 truncate font-mono text-[12.435px] leading-[15.826px] text-default">
        {children}
      </span>
    </li>
  );
}
