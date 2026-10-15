import { Check } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { completeChecklistItemAction, hideChecklistAction } from '@/app/(account)/onboarding/actions';
import { FoldAwayButton, FoldsAway } from '@/components/dashboard/folds-away';
import { configureChannelPath } from '@/components/dashboard/nav';
import { buttonClassName, SMALL_BUTTON } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { cn } from '@/lib/utils';

type PutToWorkProps = {
  /** What the agent is called in a sentence: its address without the domain. */
  handle: string;
  address: string;
  /** The public card's address, written out without `https://`. */
  cardLink: string;
  /** The items the operator has ticked off by doing them (`address`, `card`). */
  done: string[];
  /** A channel besides email is connected (Telegram or Slack), so the agent needs no second one. */
  secondChannelConnected: boolean;
};

/**
 * "Put atlas to work": things worth doing with a freshly set up agent, on the Inbox page until the operator
 * hides the list, which folds it away. Copying is what ticks the first two off. The third, a second channel,
 * shows only while the agent has none besides email; "Add Telegram" opens Telegram's drawer on Configure.
 */
export function PutToWork({ handle, address, cardLink, done, secondChannelConnected }: PutToWorkProps) {
  const addressDone = done.includes('address');
  const cardDone = done.includes('card');
  const doneCount = [addressDone, cardDone].filter(Boolean).length;
  const itemCount = secondChannelConnected ? 2 : 3;
  const ask = `Sign up for Linear with ${address}.`;

  return (
    <FoldsAway action={hideChecklistAction}>
      <section className="animate-rise-in overflow-hidden rounded-[10px] border border-border motion-reduce:animate-none">
        <div className="flex items-center gap-2.5 border-b border-border bg-subtle px-4 py-3">
          <h2 className="text-[13px] leading-4.5 font-medium text-foreground">Put {handle} to work</h2>
          {/* A new key per count, so the number fades in when an item is ticked off. */}
          <p
            key={doneCount}
            className="animate-overlay-in font-mono text-[11px] leading-4 text-muted motion-reduce:animate-none"
          >
            {doneCount} of {itemCount}
          </p>
          <FoldAwayButton className={buttonClassName('quiet', cn(SMALL_BUTTON, 'ml-auto'))}>Hide</FoldAwayButton>
        </div>
        <ul>
          <Item
            done={addressDone}
            title="Use the address for something real"
            description={`Tell your agent: “${ask}”`}
            action={
              <CopyButton
                value={ask}
                label="Copy what to tell your agent"
                variant="secondary"
                className={SMALL_BUTTON}
                labelOnly
                onCopy={completeChecklistItemAction.bind(null, 'address')}
              >
                Copy
              </CopyButton>
            }
          />
          <Item
            done={cardDone}
            title={`Share ${handle}’s card`}
            description={`One link with every way to reach ${handle}: ${cardLink}`}
            action={
              <CopyButton
                value={`https://${cardLink}`}
                label="Copy the link to the card"
                variant="secondary"
                className={SMALL_BUTTON}
                labelOnly
                onCopy={completeChecklistItemAction.bind(null, 'card')}
              >
                Copy link
              </CopyButton>
            }
          />
          {!secondChannelConnected && (
            <Item
              done={false}
              title={`Give ${handle} a second channel`}
              description="People who’d rather text can reach it on Telegram."
              action={
                <Link href={configureChannelPath('telegram')} className={buttonClassName('secondary', SMALL_BUTTON)}>
                  Add Telegram
                </Link>
              }
            />
          )}
        </ul>
      </section>
    </FoldsAway>
  );
}

type ItemProps = {
  done: boolean;
  title: string;
  description: string;
  action: ReactNode;
};

function Item({ done, title, description, action }: ItemProps) {
  return (
    <li className="flex items-center gap-3.5 border-b border-border px-4 py-3.25 last:border-b-0">
      <span
        className={cn(
          'flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 motion-reduce:transition-none',
          done ? 'border-success bg-success text-background' : 'border-border-strong'
        )}
      >
        {done && (
          <Check
            aria-hidden="true"
            className="size-2.5 animate-overlay-in motion-reduce:animate-none"
            strokeWidth={3}
          />
        )}
        <span className="sr-only">{done ? 'Done:' : 'To do:'}</span>
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h3
          className={cn(
            'text-[13px] leading-4.5 font-medium transition-colors duration-300 motion-reduce:transition-none',
            done ? 'text-secondary' : 'text-foreground'
          )}
        >
          {title}
        </h3>
        <p className="text-xs leading-4.25 text-secondary">{description}</p>
      </div>
      {action}
    </li>
  );
}
