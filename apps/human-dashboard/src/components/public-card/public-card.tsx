'use client';

import { Send } from 'lucide-react';

import { ChannelLogo } from '@/app/(account)/(dashboard)/configure/channel-logo';
import { CardLine, CardName, CardPortrait, CopyLine } from '@/components/agent-card/card-parts';
import { buttonClassName, SMALL_BUTTON } from '@/components/ui/button';
import { writtenLink } from '@/lib/onboarding';
import type { PublicAgentCard } from '@/lib/public-agent-card';

import { GetAnInbox } from './get-an-inbox';
import { TiltCard } from './tilt-card';

/**
 * The agent's public card (`4 · Public card · inbox.md/atlas`): the Configure page's card, 360px wide and
 * glowing, with only the ways to reach the agent, and "Message atlas", which starts an email to it. It
 * rises in once the page has loaded, and leans towards the pointer with a glare across it (`TiltCard`).
 */
export function PublicCard({ card }: { card: PublicAgentCard }) {
  return (
    <div className="flex w-90 max-w-full animate-rise-in flex-col items-center gap-4 motion-reduce:animate-none">
      <TiltCard
        aria-label={`${card.name}’s card`}
        className="w-full overflow-hidden rounded-[14px] border border-border-strong bg-background shadow-[0_0_48px_0_rgb(255_92_48/0.2),0_28px_56px_0_rgb(0_0_0/0.55)]"
      >
        <CardPortrait
          wide
          handle={card.handle}
          address={card.address}
          pictureUrl={card.pictureUrl ?? undefined}
          state={card.status}
        />

        <CardName name={card.name} operatorName={card.operatorName} createdAt={card.issuedAt} />

        <ul className="flex flex-col px-3 pb-2">
          <CardLine
            icon={<ChannelLogo via="email" size={16} />}
            label={card.address}
            end={<CopyLine value={card.address} label="Copy the email address" />}
          />
          {card.telegramBot && (
            <CardLine
              icon={<ChannelLogo via="telegram" size={16} />}
              label={card.telegramBot}
              end={<CopyLine value={card.telegramBot} label="Copy the Telegram bot handle" />}
            />
          )}
        </ul>

        <div className="flex items-center gap-2 border-t border-border px-3.5 py-3">
          <p className="min-w-0 flex-1 truncate font-mono text-xs leading-4 text-default">
            {writtenLink(card.cardLink)}
          </p>
          <a href={`mailto:${card.address}`} className={buttonClassName('primary', SMALL_BUTTON)}>
            <Send aria-hidden="true" className="size-3.5" />
            Message {card.handle}
          </a>
        </div>
      </TiltCard>

      <p className="text-center text-xs leading-4 text-secondary">Email, Telegram or Slack.</p>
      <GetAnInbox />
    </div>
  );
}
