import React, { forwardRef, useEffect, useState, useCallback } from 'react';
import { WorkflowResponseDto } from '@novu/shared';

import { ActivityPanel } from '@/components/activity/activity-panel';
import { useFetchActivities } from '@/hooks/use-fetch-activities';
import { Button } from '@/components/primitives/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/primitives/sheet';
import { ActivitySkeleton } from '@/components/activity/activity-skeleton';
import { ActivityError } from '@/components/activity/activity-error';
import { ActivityOverview } from '@/components/activity/components/activity-overview';
import { ActivityLogs } from '@/components/activity/activity-logs';
import { usePullActivity } from '@/hooks/use-pull-activity';
import { TestWorkflowInstructions } from './test-workflow-instructions';
import { RiCheckboxCircleFill } from 'react-icons/ri';

type TestWorkflowActivityDrawerProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId?: string;
  workflow?: WorkflowResponseDto;
  to?: Record<string, string>;
  payload?: string;
};

export const TestWorkflowActivityDrawer = forwardRef<HTMLDivElement, TestWorkflowActivityDrawerProps>(
  (props, forwardedRef) => {
    const { isOpen, onOpenChange, transactionId, workflow, to, payload } = props;
    const [parentActivityId, setParentActivityId] = useState<string | undefined>(undefined);
    const [shouldRefetch, setShouldRefetch] = useState(true);
    const [showInstructions, setShowInstructions] = useState(false);
    const [localTransactionId, setLocalTransactionId] = useState<string | undefined>(transactionId);

    const {
      activities,
      isPending: areActivitiesPending,
      error: activitiesError,
    } = useFetchActivities(
      {
        filters: localTransactionId ? { transactionId: localTransactionId } : undefined,
      },
      {
        enabled: !!localTransactionId,
        refetchInterval: shouldRefetch ? 1000 : false,
      }
    );

    const activityId: string | undefined = parentActivityId ?? activities?.[0]?._id;
    const {
      activity: latestActivity,
      isPending: isActivityPending,
      error: activityError,
    } = usePullActivity(activityId);
    const activity = latestActivity ?? activities?.[0];
    const isPending = areActivitiesPending || isActivityPending;
    const error = activitiesError || activityError;

    useEffect(() => {
      if (activityId) {
        setShouldRefetch(false);
      }
    }, [activityId]);

    const handleTransactionIdChange = useCallback((newTransactionId: string) => {
      setLocalTransactionId(newTransactionId);
      setParentActivityId(undefined);
    }, []);

    useEffect(() => {
      if (!transactionId) {
        return;
      }

      setShouldRefetch(true);
      setLocalTransactionId(transactionId);
    }, [transactionId]);

    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent ref={forwardedRef} className="w-[490px]">
          <SheetTitle className="text-label-sm text-text-strong border-b border-neutral-200 p-3">Event Logs</SheetTitle>

          <div className="flex h-full max-h-full flex-1 flex-col overflow-auto">
            {localTransactionId ? (
              <>
                <ActivityPanel>
                  {isPending ? (
                    <ActivitySkeleton />
                  ) : error || !activity ? (
                    <ActivityError />
                  ) : (
                    <React.Fragment key={activityId}>
                      <ActivityOverview activity={activity} />
                      <ActivityLogs activity={activity} onActivitySelect={setParentActivityId} />
                    </React.Fragment>
                  )}
                  {!workflow?.lastTriggeredAt && (
                    <div className="border-t border-neutral-100 p-3">
                      <div className="border-stroke-soft bg-bg-weak rounded-8 flex items-center justify-between gap-3 border p-3 py-2">
                        <div className="flex items-center gap-3">
                          <div className="bg-success-100 flex size-6 items-center justify-center rounded-full">
                            <RiCheckboxCircleFill className="text-success size-5" />
                          </div>
                          <div>
                            <div className="text-success text-label-xs">You have triggered the workflow!</div>
                            <div className="text-text-sub text-label-xs">
                              Now integrate the workflow in your application.
                            </div>
                          </div>
                        </div>
                        <Button variant="secondary" mode="outline" size="2xs" onClick={() => setShowInstructions(true)}>
                          Integrate workflow
                        </Button>
                      </div>
                    </div>
                  )}
                </ActivityPanel>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-6 p-6 text-center">
                <div className="flex flex-col gap-2">
                  <p className="text-foreground-400 max-w-[30ch] text-sm">No activity data available</p>
                </div>
              </div>
            )}

            <TestWorkflowInstructions
              isOpen={showInstructions}
              onClose={() => setShowInstructions(false)}
              workflow={workflow}
              to={to}
              payload={payload}
            />
          </div>
        </SheetContent>
      </Sheet>
    );
  }
);

TestWorkflowActivityDrawer.displayName = 'TestWorkflowActivityDrawer';
