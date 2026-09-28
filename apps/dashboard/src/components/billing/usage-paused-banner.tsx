import { ApiServiceLevelEnum, FeatureFlagsKeysEnum, PermissionsEnum } from '@novu/shared';
import { format } from 'date-fns';
import { ReactNode } from 'react';
import { RiArrowRightSLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { UPGRADE_CTA_LABEL, usePlanUpgradeClick } from '@/components/billing/use-plan-upgrade-click';
import { EDIT_USAGE_LIMITS_ROUTE } from '@/components/billing/utils/usage-limits.constants';
import { linkButtonVariants } from '@/components/primitives/button-link';
import { IS_SELF_HOSTED } from '@/config';
import { useContactSupport } from '@/hooks/use-contact-support';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';
import { useHasPermission } from '@/hooks/use-has-permission';

const { root: actionRoot, icon: actionIcon } = linkButtonVariants({ variant: 'modifiable', size: 'sm' });
const actionClassName = actionRoot({ class: 'text-label-xs text-static-white gap-0.5' });
const actionIconClassName = actionIcon();

type UsagePausedStripProps = {
  message: string;
  primaryAction?: ReactNode;
};

function UsagePausedStrip({ message, primaryAction }: UsagePausedStripProps) {
  const contactSupport = useContactSupport();

  return (
    <div className="bg-error-base text-label-xs text-static-white flex shrink-0 flex-wrap items-center justify-center gap-x-3 gap-y-0.5 bg-[linear-gradient(180deg,rgba(255,255,255,0.24)_0%,rgba(255,255,255,0)_100%)] px-3 py-1.5 text-center">
      <span>{message}</span>
      <div className="flex items-center gap-1.5">
        {primaryAction}
        {primaryAction && <span aria-hidden="true">·</span>}
        <button type="button" className={actionClassName} onClick={contactSupport}>
          Contact support
        </button>
      </div>
    </div>
  );
}

function PaidUsagePausedBanner() {
  const has = useHasPermission();
  const canEditLimits = has({ permission: PermissionsEnum.BILLING_WRITE });

  return (
    <UsagePausedStrip
      message="You've hit your usage limit. Your included usage and allowed overages have been fully used. New workflow runs are currently paused."
      primaryAction={
        canEditLimits ? (
          <Link to={EDIT_USAGE_LIMITS_ROUTE} className={actionClassName}>
            Edit limits
            <RiArrowRightSLine className={actionIconClassName} />
          </Link>
        ) : undefined
      }
    />
  );
}

function FreeUsagePausedBanner({ resetDate }: { resetDate: string | null }) {
  const planUpgradeClick = usePlanUpgradeClick('workflow-runs-paused-banner', 'workflow_runs_paused');
  const resetSuffix = resetDate ? ` on ${format(new Date(resetDate), 'MMM d, yyyy')}` : '';

  return (
    <UsagePausedStrip
      message={`You've used all workflow runs included in your plan. New workflow runs are paused until your usage resets${resetSuffix}.`}
      primaryAction={
        <button type="button" className={actionClassName} onClick={planUpgradeClick}>
          {UPGRADE_CTA_LABEL}
          <RiArrowRightSLine className={actionIconClassName} />
        </button>
      }
    />
  );
}

/** Org-wide, non-dismissible notice shown to every member while new workflow runs are paused. */
export function UsagePausedBanner() {
  const isUsageLimitsEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_WORKFLOW_RUN_USAGE_LIMITS_ENABLED, false);
  const { subscription } = useFetchSubscription();

  if (IS_SELF_HOSTED || !isUsageLimitsEnabled || !subscription?.events.isPaused) {
    return null;
  }

  switch (subscription.apiServiceLevel) {
    case ApiServiceLevelEnum.FREE:
      return <FreeUsagePausedBanner resetDate={subscription.currentPeriodEnd} />;
    case ApiServiceLevelEnum.PRO:
    case ApiServiceLevelEnum.BUSINESS:
      return <PaidUsagePausedBanner />;
    case ApiServiceLevelEnum.ENTERPRISE:
    case ApiServiceLevelEnum.UNLIMITED:
      return null;
    default: {
      const _exhaustive: never = subscription.apiServiceLevel;

      return null;
    }
  }
}
