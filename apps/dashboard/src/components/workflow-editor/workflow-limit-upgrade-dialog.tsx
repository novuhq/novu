import { PlanLimitUpgradeDialog } from '@/components/billing/plan-limit-upgrade-dialog';
import type { WorkflowLimitError } from '@/hooks/use-create-workflow';

type WorkflowLimitUpgradeDialogProps = {
  /** The limit that blocked creation, or null when no limit was hit. */
  error: WorkflowLimitError | null;
  onClose: () => void;
};

/** Hard block for workflow creation. Always points the user to upgrading their plan. */
export function WorkflowLimitUpgradeDialog({ error, onClose }: WorkflowLimitUpgradeDialogProps) {
  if (!error) {
    return null;
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <PlanLimitUpgradeDialog
      open
      onOpenChange={handleOpenChange}
      title="You've reached your workflow limit"
      description={
        <>
          Your plan includes{' '}
          <span className="font-medium">
            {error.limit} {error.limit === 1 ? 'workflow' : 'workflows'}
          </span>
          . Upgrade your plan to create more.
        </>
      }
      primaryCta="upgrade"
      telemetrySource="workflows-plan-limit-dialog"
      utmCampaign="workflows_plan_limit"
    />
  );
}
