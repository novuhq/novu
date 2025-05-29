import { HTMLAttributes } from 'react';
import { cn } from '@/utils/ui';
import { Send } from '@/components/icons/send';
import { UpgradeCTATooltip } from '@/components/upgrade-cta-tooltip';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { Switch } from '@/components/primitives/switch';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';
import { ApiServiceLevelEnum, FeatureNameEnum, getFeatureForTierAsBoolean } from '@novu/shared';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/utils/routes';
import { Separator } from '@/components/primitives/separator';
import { useFetchOrganizationSettings } from '@/hooks/use-fetch-organization-settings';
import { useUpdateOrganizationSettings } from '@/hooks/use-update-organization-settings';

type NovuBrandingProps = HTMLAttributes<HTMLDivElement>;

export const NovuBranding = ({ className, ...rest }: NovuBrandingProps) => {
  const { subscription } = useFetchSubscription();
  const navigate = useNavigate();
  const { data: organizationSettings, isLoading: isLoadingSettings } = useFetchOrganizationSettings();
  const updateOrganizationSettings = useUpdateOrganizationSettings();

  const canRemoveNovuBranding = getFeatureForTierAsBoolean(
    FeatureNameEnum.PLATFORM_REMOVE_NOVU_BRANDING_BOOLEAN,
    subscription?.apiServiceLevel || ApiServiceLevelEnum.FREE
  );

  const removeNovuBranding = organizationSettings?.data?.removeNovuBranding;
  const isUpdating = updateOrganizationSettings.isPending;

  if (removeNovuBranding) return null;

  const handleRemoveBrandingChange = (value: boolean) => {
    updateOrganizationSettings.mutate({
      removeNovuBranding: value,
    });
  };

  const handleOrganizationSettingsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(ROUTES.SETTINGS_ORGANIZATION);
  };

  const brandingContent = (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-1">
        <Send width={12} height={12} className="text-foreground-400" />
        <span className="text-foreground-400 font-mono text-xs font-medium leading-3">POWERED BY</span>
      </div>
      <img src="/images/novu-logo-dark.svg" alt="Novu" className="-ml-1 h-4 w-14 object-contain" />
    </div>
  );

  const settingsTooltipContent = (
    <>
      <div className="flex w-full items-center justify-between">
        <span className="text-xs">Remove branding?</span>
        <Switch
          checked={removeNovuBranding}
          onCheckedChange={handleRemoveBrandingChange}
          disabled={isLoadingSettings || isUpdating}
        />
      </div>

      <Separator />

      <div className="flex flex-col items-start">
        <p className="text-xs text-neutral-500">
          You can manage this in{' '}
          <button
            onClick={handleOrganizationSettingsClick}
            className="inline-flex items-center gap-1 font-medium underline hover:no-underline"
          >
            Organization settings ↗
          </button>{' '}
          later.
        </p>
      </div>
    </>
  );

  return (
    <div className={cn('flex items-center justify-center gap-1.5 pb-6 pt-4', className)} {...rest}>
      {!canRemoveNovuBranding ? (
        <UpgradeCTATooltip
          description="Upgrade to remove Novu branding from your emails."
          utmSource="novu-branding-email"
          side="top"
          align="center"
        >
          {brandingContent}
        </UpgradeCTATooltip>
      ) : (
        <Tooltip>
          <TooltipTrigger>{brandingContent}</TooltipTrigger>
          <TooltipContent
            side="top"
            align="center"
            variant="light"
            size="lg"
            className="flex w-72 flex-col items-start gap-3 border border-neutral-100 p-2 shadow-md"
          >
            {settingsTooltipContent}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
};
