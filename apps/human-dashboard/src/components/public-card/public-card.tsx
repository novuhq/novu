'use client';

import type { ReactNode } from 'react';

import { AgentCardVertical, CardMascot } from '@/components/agent-card/agent-card-vertical';
import { CardName, CardPortrait } from '@/components/agent-card/card-parts';
import { CopyButton } from '@/components/ui/copy-button';
import { cardSerialOf } from '@/lib/agent-card';
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
  if (card.newCard) {
    return <NewPublicCard card={card} />;
  }

  return (
    <div className="w-full animate-rise-in motion-reduce:animate-none">
      <TiltCard
        aria-label={`${card.name}’s card`}
        className="w-full overflow-hidden rounded-[14px] border border-border-strong bg-background"
      >
        <CardPortrait
          handle={card.handle}
          cardLink={card.cardLink}
          pictureUrl={card.pictureUrl ?? undefined}
          state={card.status}
        />

        <CardName
          name={card.name}
          operatorName={card.operatorName}
          createdAt={card.issuedAt}
          withoutOperator="An agent"
        />

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

/**
 * The public card as the new agent card (`Agent card · Vertical`), for the accounts that have it: the agent's look,
 * who runs it, its address and Telegram bot, and its link. It rises in and leans towards the pointer as the ID card
 * does.
 */
function NewPublicCard({ card }: { card: PublicAgentCard }) {
  const status =
    card.status === 'paused' ? 'Paused for now' : card.operatorName ? `Run by ${card.operatorName}` : 'An agent';

  return (
    <div className="w-full animate-rise-in motion-reduce:animate-none">
      <TiltCard aria-label={`${card.name}’s card`} cornerClassName="rounded-[6%/3.9%]" className="w-full">
        <AgentCardVertical
          look={card.look}
          name={card.name}
          status={status}
          address={card.address}
          link={writtenLink(card.cardLink)}
          serial={cardSerialOf(card.handle)}
          mascot={<CardMascot look={card.look} />}
          picture={card.pictureUrl ?? undefined}
          lines={{ telegram: card.telegramBot }}
          className="w-full"
        />
      </TiltCard>
    </div>
  );
}
