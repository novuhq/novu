import React, { forwardRef } from 'react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

import { SheetContent, SheetDescription, SheetTitle } from '@/components/primitives/sheet';
import { usePullActivity } from '@/hooks/use-pull-activity';
import { Sheet } from '@/components/primitives/sheet';
import { cn } from '@/utils/ui';
import { ActivityPanel } from '@/components/activity/activity-panel';
import { ActivitySkeleton } from '@/components/activity/activity-skeleton';
import { ActivityError } from '@/components/activity/activity-error';
import { ActivityHeader } from '@/components/activity/activity-header';
import { ActivityOverview } from '@/components/activity/components/activity-overview';
import { ActivityLogs } from '@/components/activity/activity-logs';

type ActivityPanelDrawerProps = {
  onActivitySelect: (activityId: string) => void;
  activityId: string;
};

export const ActivityDetailsDrawer = forwardRef<HTMLDivElement, ActivityPanelDrawerProps>((props, ref) => {
  const { activityId, onActivitySelect } = props;
  const isOpen = !!activityId;
  const { activity, isPending, error } = usePullActivity(activityId);

  return (
    <Sheet
      modal={false}
      open={isOpen}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onActivitySelect('');
        }
      }}
    >
      <div
        className={cn('fade-in animate-in fixed inset-0 z-50 bg-black/20 transition-opacity duration-300', {
          'pointer-events-none opacity-0': !isOpen,
        })}
      />
      <SheetContent
        ref={ref}
        className={
          // to make the drawers stacking effect, we need to make sure the width is a bit smaller than the normal sidebar width
          'w-3/4 sm:max-w-[540px] [&_[data-close-button="true"]]:right-3 [&_[data-close-button="true"]]:top-[calc(0.75rem+2px)]'
        }
      >
        <VisuallyHidden>
          <SheetTitle />
          <SheetDescription />
        </VisuallyHidden>
        <ActivityPanel>
          {isPending ? (
            <ActivitySkeleton headerClassName="h-12" />
          ) : error || !activity ? (
            <ActivityError />
          ) : (
            <React.Fragment key={activityId}>
              <ActivityHeader title={activity.template?.name} className="h-12 py-3" />
              <ActivityOverview activity={activity} />
              <ActivityLogs activity={activity} onActivitySelect={onActivitySelect} />
            </React.Fragment>
          )}
        </ActivityPanel>
      </SheetContent>
    </Sheet>
  );
});
