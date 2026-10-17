import { StageCard } from '@/components/site/stage';
import { AgentAvatar } from '@/components/ui/agent-avatar';

import { GetAnInbox } from './get-an-inbox';

/**
 * What a card's link shows when there is no card to show: no agent has the handle, it was deleted, or only
 * its contacts can reach it. Which of these it is stays untold. Not in the design: the site's card for a
 * missing page, with the line that leads to the product under it.
 */
export function CardUnavailable() {
  return (
    <div className="flex w-full max-w-md animate-rise-in flex-col items-center gap-4 motion-reduce:animate-none">
      <StageCard
        icon={<AgentAvatar mood="asleep" className="size-12 rounded-full" />}
        title="This card isn’t available"
        description="There’s no agent card at this link. Check the link, or ask whoever shared it."
      />
      <GetAnInbox />
    </div>
  );
}
