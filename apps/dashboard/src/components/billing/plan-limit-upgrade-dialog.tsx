import { Cross2Icon } from '@radix-ui/react-icons';
import type { ReactNode } from 'react';
import { RiCustomerService2Line, RiInformationLine, RiLockStarLine, RiSparkling2Line } from 'react-icons/ri';
import { UPGRADE_CTA_LABEL, usePlanUpgradeClick } from '@/components/billing/use-plan-upgrade-click';
import { Button } from '@/components/primitives/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/components/primitives/dialog';
import { SUPPORT_EMAIL } from '@/config';
import { usePlainChat } from '@/hooks/use-plain-chat';

export type PlanLimitUpgradeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  /** Rendered as a secondary "continue past the warning" button when provided. */
  continueLabel?: string;
  onContinueAnyway?: () => void;
  /**
   * `upgrade` renders the plan-upgrade CTA; `contact-support` opens live chat
   * (or support email) for limits that upgrading cannot lift.
   */
  primaryCta: 'upgrade' | 'contact-support';
  telemetrySource: string;
  utmCampaign: string;
};

/**
 * Generic billing primitive behind every plan-limit dialog (agents, channels,
 * domains, …). Feature wrappers own the copy; this owns the layout, the
 * upgrade/contact-support CTAs, and the upgrade-click flow.
 */
export function PlanLimitUpgradeDialog({
  open,
  onOpenChange,
  title,
  description,
  continueLabel,
  onContinueAnyway,
  primaryCta,
  telemetrySource,
  utmCampaign,
}: PlanLimitUpgradeDialogProps) {
  const planUpgradeClick = usePlanUpgradeClick(telemetrySource, utmCampaign);
  const { isLiveChatVisible, showPlainLiveChat } = usePlainChat();

  const handleUpgradeClick = () => {
    onOpenChange(false);
    planUpgradeClick();
  };

  const handleContactSupportClick = () => {
    onOpenChange(false);

    if (isLiveChatVisible) {
      showPlainLiveChat();

      return;
    }

    window.location.href = `mailto:${SUPPORT_EMAIL}`;
  };

  const handleContinueAnyway = () => {
    onOpenChange(false);
    onContinueAnyway?.();
  };

  return (
    <Dialog modal open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="max-w-[440px] gap-4 overflow-hidden rounded-xl! p-4" hideCloseButton>
          <div className="flex items-start justify-between">
            {primaryCta === 'upgrade' ? (
              <div className="flex items-center gap-1 rounded bg-red-50 px-2 py-1">
                <RiLockStarLine className="h-3 w-3 text-pink-600" />
                <span
                  className="text-[10px] font-medium uppercase leading-normal"
                  style={{
                    background: 'linear-gradient(225deg, #FF884D 23.17%, #E300BD 80.17%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Plan limit reached
                </span>
              </div>
            ) : (
              // Softer, non-upsell badge — shown to enterprise/unlimited customers
              // for whom upgrading is not the answer.
              <div className="bg-bg-weak flex items-center gap-1 rounded px-2 py-1">
                <RiInformationLine className="text-text-soft h-3 w-3" />
                <span className="text-text-sub text-[10px] font-medium uppercase leading-normal">Limit reached</span>
              </div>
            )}
            <DialogClose>
              <Cross2Icon className="size-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>

          <div className="flex min-w-0 flex-col gap-1 overflow-hidden">
            <DialogTitle className="text-md font-medium tracking-normal">{title}</DialogTitle>
            <DialogDescription className="text-foreground-600 min-w-0 overflow-hidden">{description}</DialogDescription>
          </div>

          <DialogFooter>
            {continueLabel && onContinueAnyway && (
              <Button type="button" size="sm" mode="outline" variant="secondary" onClick={handleContinueAnyway}>
                {continueLabel}
              </Button>
            )}
            {primaryCta === 'upgrade' ? (
              <Button
                type="button"
                size="sm"
                variant="primary"
                mode="gradient"
                leadingIcon={RiSparkling2Line}
                onClick={handleUpgradeClick}
              >
                {UPGRADE_CTA_LABEL}
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="primary"
                leadingIcon={RiCustomerService2Line}
                onClick={handleContactSupportClick}
              >
                Contact support
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
