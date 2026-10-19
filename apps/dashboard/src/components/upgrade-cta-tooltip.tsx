import { ApiServiceLevelEnum } from '@novu/shared';
import { ReactNode } from 'react';
import { RiExternalLinkLine, RiLockStarLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { IS_SELF_HOSTED, SELF_HOSTED_UPGRADE_REDIRECT_URL } from '@/config';
import { ROUTES } from '@/utils/routes';
import { getPlanLabel } from '@/utils/upgrade-tier';
import { openInNewTab } from '@/utils/url';

type UpgradeCTATooltipProps = {
  children: ReactNode;
  title?: string;
  description?: string;
  /**
   * Lowest tier that unlocks the gated feature. When set (on cloud), the copy
   * and CTA name the exact plan the user needs (e.g. "Upgrade to Team") instead
   * of a generic upgrade prompt. Ignored on self-hosted, where naming a cloud
   * tier would be misleading.
   */
  requiredTier?: ApiServiceLevelEnum | null;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  utmCampaign?: string;
  utmSource?: string;
};

export function UpgradeCTATooltip({
  children,
  description,
  requiredTier,
  side = 'bottom',
  align = 'end',
  sideOffset = 4,
  utmCampaign = 'upgrade_prompt',
  utmSource = 'upgrade_prompt',
}: UpgradeCTATooltipProps) {
  const navigate = useNavigate();

  const tierLabel = requiredTier && !IS_SELF_HOSTED ? getPlanLabel(requiredTier) : null;

  let defaultDescription: string;
  if (IS_SELF_HOSTED) {
    defaultDescription = 'Unlock this feature by upgrading to Cloud plans';
  } else if (tierLabel) {
    defaultDescription = `Unlock this feature by upgrading to the ${tierLabel} plan`;
  } else {
    defaultDescription = 'Unlock this feature by upgrading to a paid plan';
  }

  const ctaLabel = tierLabel ? `Upgrade to ${tierLabel}` : 'Upgrade plan';

  const finalDescription = description || defaultDescription;

  const handleUpgradeClick = () => {
    if (IS_SELF_HOSTED) {
      openInNewTab(`${SELF_HOSTED_UPGRADE_REDIRECT_URL}?utm_campaign=${utmCampaign}`);
    } else {
      navigate(`${ROUTES.SETTINGS_BILLING}?utm_source=${utmSource}`);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side={side}
        align={align}
        sideOffset={sideOffset}
        variant="light"
        size="lg"
        className="flex w-72 flex-col items-start gap-3 border border-neutral-100 p-2 shadow-md"
      >
        {/* Badge */}
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
            PREMIUM FEATURE
          </span>
        </div>

        {/* Label */}
        <div className="flex flex-col items-start gap-3">
          <p className="text-xs text-neutral-500">{finalDescription}</p>
          <div className="flex w-full">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleUpgradeClick();
              }}
              className="flex items-center gap-1 text-xs font-medium text-neutral-900 hover:underline"
            >
              {ctaLabel} <RiExternalLinkLine className="h-3 w-3" />
            </button>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
