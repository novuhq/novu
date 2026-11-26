import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWorkflowLimitUsage } from '@/api/workflows';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import type { WorkflowLimitError } from '@/hooks/use-create-workflow';
import { QueryKeys } from '@/utils/query-keys';
import { buildRoute, ROUTES } from '@/utils/routes';

/**
 * The workflow limit a create or duplicate in the current environment would hit, or null when there is room.
 * Read again on every mount, so a workflow deleted since the last read no longer counts. A failed read stays silent:
 * the API still rejects a create over the limit, and the form shows that error instead.
 */
function useWorkflowLimitReached(): WorkflowLimitError | null {
  const { currentEnvironment } = useEnvironment();
  const { data, isFetchedAfterMount } = useQuery({
    queryKey: [QueryKeys.fetchWorkflowLimitUsage, currentEnvironment?._id],
    queryFn: ({ signal }) =>
      getWorkflowLimitUsage({
        environment: requireEnvironment(currentEnvironment, 'No current environment selected'),
        signal,
      }),
    enabled: !!currentEnvironment?._id,
    refetchOnMount: 'always',
    retry: false,
    meta: { showError: false },
  });

  if (!isFetchedAfterMount || !data?.isLimitReached) {
    return null;
  }

  return { limit: data.limit, limitSource: data.limitSource };
}

/**
 * What a create or duplicate workflow form passes to `WorkflowLimitUpgradeDialog`. The limit is checked as the form
 * opens, so a user at it learns that before writing a prompt or filling the form; closing that dialog leaves the form.
 * Otherwise the dialog shows the limit error the form's submit got, if any.
 */
export function useWorkflowLimitDialog({
  submitLimitError,
  clearSubmitLimitError,
}: {
  submitLimitError: WorkflowLimitError | null;
  clearSubmitLimitError: () => void;
}) {
  const navigate = useNavigate();
  const { currentEnvironment } = useEnvironment();
  const openLimitError = useWorkflowLimitReached();
  const [isOpenLimitDismissed, setIsOpenLimitDismissed] = useState(false);
  const blockingLimitError = isOpenLimitDismissed ? null : openLimitError;

  const onClose = () => {
    if (!blockingLimitError) {
      clearSubmitLimitError();

      return;
    }

    setIsOpenLimitDismissed(true);
    // At once rather than after the form's exit animation: the upgrade button navigates to billing right after this.
    void navigate(buildRoute(ROUTES.WORKFLOWS, { environmentSlug: currentEnvironment?.slug ?? '' }));
  };

  return { error: blockingLimitError ?? submitLimitError, onClose };
}
