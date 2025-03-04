import React, { useEffect, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { RiCheckboxCircleFill } from 'react-icons/ri';
import { WorkflowResponseDto } from '@novu/shared';

import { ActivityPanel } from '@/components/activity/activity-panel';
import { useFetchActivities } from '../../../hooks/use-fetch-activities';
import { WorkflowTriggerInboxIllustration } from '../../icons/workflow-trigger-inbox';
import { Button } from '../../primitives/button';
import { TestWorkflowFormType } from '../schema';
import { TestWorkflowInstructions } from './test-workflow-instructions';
import { ActivitySkeleton } from '@/components/activity/activity-skeleton';
import { ActivityError } from '@/components/activity/activity-error';
import { ActivityHeader } from '@/components/activity/activity-header';
import { ActivityOverview } from '@/components/activity/components/activity-overview';
import { ActivityLogs } from '@/components/activity/activity-logs';
import { usePullActivity } from '@/hooks/use-pull-activity';

type TestWorkflowLogsSidebarProps = {
  transactionId?: string;
  workflow?: WorkflowResponseDto;
};

export const TestWorkflowLogsSidebar = ({ transactionId, workflow }: TestWorkflowLogsSidebarProps) => {
  const { control } = useFormContext<TestWorkflowFormType>();
  const [parentActivityId, setParentActivityId] = useState<string | undefined>(undefined);
  const [shouldRefetch, setShouldRefetch] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);
  const to = useWatch({ name: 'to', control });
  const payload = useWatch({ name: 'payload', control });

  const {
    activities,
    isPending: areActivitiesPending,
    error: activitiesError,
  } = useFetchActivities(
    {
      filters: transactionId ? { transactionId } : undefined,
    },
    {
      enabled: !!transactionId,
      refetchInterval: shouldRefetch ? 1000 : false,
    }
  );

  const activityId: string | undefined = parentActivityId ?? activities?.[0]?._id;
  const { activity: latestActivity, isPending: isActivityPending, error: activityError } = usePullActivity(activityId);
  const activity = latestActivity ?? activities?.[0];
  const isPending = areActivitiesPending || isActivityPending;
  const error = activitiesError || activityError;

  useEffect(() => {
    if (activityId) {
      setShouldRefetch(false);
    }
  }, [activityId]);

  // Reset refetch when transaction ID changes
  useEffect(() => {
    if (!transactionId) {
      return;
    }

    setShouldRefetch(true);
    setParentActivityId(undefined);
  }, [transactionId]);

  return (
    <aside className="flex h-full max-h-full flex-1 flex-col overflow-auto">
      {transactionId ? (
        <>
          <ActivityPanel>
            {isPending ? (
              <ActivitySkeleton />
            ) : error || !activity ? (
              <ActivityError />
            ) : (
              <React.Fragment key={activityId}>
                <ActivityHeader title={activity.template?.name} className="h-[49px] border-t-0" />
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
                      <div className="text-text-sub text-label-xs">Now integrate the workflow in your application.</div>
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
          <div>
            <WorkflowTriggerInboxIllustration />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-foreground-400 max-w-[30ch] text-sm">
              No logs to show, trigger test run to see event logs appear here
            </p>
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
    </aside>
  );
};
