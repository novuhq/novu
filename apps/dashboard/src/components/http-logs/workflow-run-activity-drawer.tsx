import React, { forwardRef } from 'react';

import { ActivityPanel } from '@/components/activity/activity-panel';
import { Sheet, SheetContent, SheetTitle } from '@/components/primitives/sheet';
import { ActivitySkeleton } from '@/components/activity/activity-skeleton';
import { ActivityError } from '@/components/activity/activity-error';
import { ActivityOverview } from '@/components/activity/components/activity-overview';
import { ActivityLogs } from '@/components/activity/activity-logs';
import { usePullActivity } from '@/hooks/use-pull-activity';

type WorkflowRunActivityDrawerProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  activityId?: string;
};

export const WorkflowRunActivityDrawer = forwardRef<HTMLDivElement, WorkflowRunActivityDrawerProps>(
  (props, forwardedRef) => {
    const { isOpen, onOpenChange, activityId } = props;

    const { activity, isPending, error } = usePullActivity(activityId);

    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent ref={forwardedRef} className="w-[490px]">
          <SheetTitle className="text-label-sm text-text-strong border-b border-neutral-200 p-3">Event Logs</SheetTitle>

          <div className="flex h-full max-h-full flex-1 flex-col overflow-auto">
            {activityId ? (
              <ActivityPanel>
                {isPending ? (
                  <ActivitySkeleton />
                ) : error || !activity ? (
                  <ActivityError />
                ) : (
                  <React.Fragment key={activityId}>
                    <ActivityOverview activity={activity} />
                    <ActivityLogs activity={activity} />
                  </React.Fragment>
                )}
              </ActivityPanel>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-6 p-6 text-center">
                <div className="flex flex-col gap-2">
                  <p className="text-foreground-400 max-w-[30ch] text-sm">No activity data available</p>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    );
  }
);

WorkflowRunActivityDrawer.displayName = 'WorkflowRunActivityDrawer';
