import { USAGE_LIMITS_DASHBOARD_PATH } from '@novu/shared';
import type { ReactNode } from 'react';
import { RiArrowRightSLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { UPGRADE_CTA_LABEL, usePlanUpgradeClick } from '@/components/billing/use-plan-upgrade-click';
import { LinkButton, Icon as LinkButtonIcon } from '@/components/primitives/button-link';
import { useContactSupport } from '@/hooks/use-contact-support';
import { formatShortDate } from '@/utils/format-date';
import { isNearingOverageLimit } from './usage-limits-view';
import { useUsageLimitsView } from './use-usage-limits-view';

type UsageNoticeTone = 'paused' | 'warning';

const NOTICE_TONE_CLASS_NAME: Record<UsageNoticeTone, { strip: string; action: string }> = {
  paused: {
    strip: 'bg-error-base text-static-white',
    action: 'text-label-xs text-static-white gap-0.5',
  },
  warning: {
    strip: 'bg-warning-base text-static-black',
    action: 'text-label-xs text-static-black gap-0.5',
  },
};

type UsageNoticeStripProps = {
  tone: UsageNoticeTone;
  message: string;
  primaryAction?: ReactNode;
};

function UsageNoticeStrip({ tone, message, primaryAction }: UsageNoticeStripProps) {
  const contactSupport = useContactSupport();
  const { strip, action } = NOTICE_TONE_CLASS_NAME[tone];

  return (
    <div
      className={`${strip} text-label-xs flex shrink-0 flex-wrap items-center justify-center gap-x-3 gap-y-0.5 bg-[linear-gradient(180deg,rgba(255,255,255,0.24)_0%,rgba(255,255,255,0)_100%)] px-3 py-1.5 text-center`}
    >
      <span>{message}</span>
      <div className="flex items-center gap-1.5">
        {primaryAction}
        {primaryAction && <span aria-hidden="true">·</span>}
        <LinkButton variant="modifiable" size="sm" className={action} onClick={contactSupport}>
          Contact support
        </LinkButton>
      </div>
    </div>
  );
}

function PaidUsagePausedBanner({ canEdit }: { canEdit: boolean }) {
  return (
    <UsageNoticeStrip
      tone="paused"
      message="You've hit your usage limit. Your included usage and allowed overages have been fully used. New workflow runs are currently paused."
      primaryAction={
        canEdit && (
          // `asChild` keeps only the first child, so the icon goes inside the link instead of `trailingIcon`.
          <LinkButton asChild variant="modifiable" size="sm" className={NOTICE_TONE_CLASS_NAME.paused.action}>
            <Link to={USAGE_LIMITS_DASHBOARD_PATH}>
              Edit limits
              <LinkButtonIcon as={RiArrowRightSLine} />
            </Link>
          </LinkButton>
        )
      }
    />
  );
}

function NearingUsageLimitBanner({ canEdit }: { canEdit: boolean }) {
  return (
    <UsageNoticeStrip
      tone="warning"
      message="You're nearing your usage limit. You've used 90% of your allowed overages. New workflow runs will pause when you reach the limit."
      primaryAction={
        canEdit && (
          <LinkButton asChild variant="modifiable" size="sm" className={NOTICE_TONE_CLASS_NAME.warning.action}>
            <Link to={USAGE_LIMITS_DASHBOARD_PATH}>
              Edit limits
              <LinkButtonIcon as={RiArrowRightSLine} />
            </Link>
          </LinkButton>
        )
      }
    />
  );
}

function FreeUsagePausedBanner({ resetsAt }: { resetsAt: string | null }) {
  const planUpgradeClick = usePlanUpgradeClick('workflow-runs-paused-banner', 'workflow_runs_paused');
  const resetSuffix = resetsAt ? ` on ${formatShortDate(resetsAt)}` : '';

  return (
    <UsageNoticeStrip
      tone="paused"
      message={`You've used all workflow runs included in your plan. New workflow runs are paused until your usage resets${resetSuffix}.`}
      primaryAction={
        <LinkButton
          variant="modifiable"
          size="sm"
          className={NOTICE_TONE_CLASS_NAME.paused.action}
          trailingIcon={RiArrowRightSLine}
          onClick={planUpgradeClick}
        >
          {UPGRADE_CTA_LABEL}
        </LinkButton>
      }
    />
  );
}

/** Org-wide, non-dismissible notice shown to every member while new workflow runs are paused. */
export function UsagePausedBanner() {
  const view = useUsageLimitsView();

  if (!view) {
    return null;
  }

  const { pausedPlan } = view;

  switch (pausedPlan) {
    case 'free':
      return <FreeUsagePausedBanner resetsAt={view.usage.resetsAt} />;
    case 'paid':
      return <PaidUsagePausedBanner canEdit={view.canEdit} />;
    case null:
      return isNearingOverageLimit(view) ? <NearingUsageLimitBanner canEdit={view.canEdit} /> : null;
    default: {
      const exhaustiveCheck: never = pausedPlan;

      return exhaustiveCheck;
    }
  }
}
