import { PlanLimitUpgradeDialog } from '@/components/billing/plan-limit-upgrade-dialog';
import type { WorkflowLimitError } from '@/hooks/use-create-workflow';

type WorkflowLimitUpgradeDialogProps = {
  /** The limit that blocked creation, or null when no limit was hit. */
  error: WorkflowLimitError | null;
  onClose: () => void;
  /** `create` when a new workflow was blocked, `activate` when enabling a paused workflow was blocked. */
  action?: 'create' | 'activate';
};

/** Hard block for workflow creation or activation. Always points the user to upgrading their plan. */
export function WorkflowLimitUpgradeDialog({ error, onClose, action = 'create' }: WorkflowLimitUpgradeDialogProps) {
  if (!error) {
    return null;
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  const workflowsLabel = error.limit === 1 ? 'workflow' : 'workflows';

  if (action === 'activate' && error.limitSource === 'system') {
    return (
      <PlanLimitUpgradeDialog
        open
        onOpenChange={handleOpenChange}
        title="You've reached your active workflow limit"
        description={
          <>
            Your organization can have up to{' '}
            <span className="font-medium">
              {error.limit} active {workflowsLabel}
            </span>
            . Reach out to the Novu team to increase this limit, or pause another workflow first.
          </>
        }
        primaryCta="contact-support"
        telemetrySource="workflows-active-system-limit-dialog"
        utmCampaign="workflows_active_system_limit"
      />
    );
  }

  if (action === 'activate') {
    return (
      <PlanLimitUpgradeDialog
        open
        onOpenChange={handleOpenChange}
        title="You've reached your active workflow limit"
        description={
          <>
            Your plan includes up to{' '}
            <span className="font-medium">
              {error.limit} active {workflowsLabel}
            </span>
            . Upgrade your plan to activate more workflows, or pause another workflow first.
          </>
        }
        primaryCta="upgrade"
        telemetrySource="workflows-active-plan-limit-dialog"
        utmCampaign="workflows_active_plan_limit"
      />
    );
  }

  return (
    <PlanLimitUpgradeDialog
      open
      onOpenChange={handleOpenChange}
      title="You've reached your workflow limit"
      description={
        <>
          Your plan includes{' '}
          <span className="font-medium">
            {error.limit} {workflowsLabel}
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
