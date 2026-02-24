import React, { forwardRef, useEffect, useState } from 'react';
import { ActivityError } from '@/components/activity/activity-error';
import { ActivityLogs } from '@/components/activity/activity-logs';
import { ActivityPanel } from '@/components/activity/activity-panel';
import { ActivitySkeleton } from '@/components/activity/activity-skeleton';
import { ActivityOverview } from '@/components/activity/components/activity-overview';
import { Sheet, SheetContent, SheetTitle } from '@/components/primitives/sheet';
import { usePullActivity } from '@/hooks/use-pull-activity';

type WorkflowRunActivityDrawerProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  activityId?: string;
};

export const WorkflowRunActivityDrawer = forwardRef<HTMLDivElement, WorkflowRunActivityDrawerProps>(
  (props, forwardedRef) => {
    const { isOpen, onOpenChange, activityId } = props;

    const [currentActivityId, setCurrentActivityId] = useState<string | undefined>(activityId);

    useEffect(() => {
      setCurrentActivityId(activityId);
    }, [activityId]);

    const { activity, isPending, error } = usePullActivity(currentActivityId);

    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent ref={forwardedRef} className="w-[490px]">
          <SheetTitle className="text-label-sm text-text-strong border-b border-neutral-200 p-3">
            Workflow run
          </SheetTitle>

          <div className="flex h-full max-h-full flex-1 flex-col overflow-auto">
            {currentActivityId ? (
              <ActivityPanel>
                {isPending ? (
                  <ActivitySkeleton />
                ) : error || !activity ? (
                  <ActivityError />
                ) : (
                  <React.Fragment key={currentActivityId}>
                    <ActivityOverview activity={activity} />
                    <ActivityLogs activity={activity} onActivitySelect={setCurrentActivityId} />
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
