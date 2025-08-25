import { ApiServiceLevelEnum, FeatureNameEnum, getFeatureForTierAsBoolean, ResourceOriginEnum } from '@novu/shared';
import { HTMLAttributes } from 'react';
import { useNavigate } from 'react-router-dom';
import { Separator } from '@/components/primitives/separator';
import { Switch } from '@/components/primitives/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { UpgradeCTATooltip } from '@/components/upgrade-cta-tooltip';
import { useFetchOrganizationSettings } from '@/hooks/use-fetch-organization-settings';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';
import { useUpdateOrganizationSettings } from '@/hooks/use-update-organization-settings';
import { ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';

type NovuBrandingProps = HTMLAttributes<HTMLDivElement> & {
  resourceOrigin: ResourceOriginEnum;
};

export const NovuBranding = ({ className, resourceOrigin, ...rest }: NovuBrandingProps) => {
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

  const showBranding = resourceOrigin === ResourceOriginEnum.NOVU_CLOUD && !removeNovuBranding && !isLoadingSettings;

  // Don't render anything while loading or if branding should be removed
  if (!showBranding) return null;

  const handleRemoveBrandingChange = (value: boolean) => {
    updateOrganizationSettings.mutate({
      removeNovuBranding: value,
    });
  };

  const handleOrganizationSettingsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(ROUTES.SETTINGS_ORGANIZATION);
  };

  /**
   * Same branding is appended to the actual email
   * @see apps/api/src/app/environments-v1/usecases/output-renderers/novu-branding-html.ts
   */
  const brandingContent = (
    <div className="flex items-center">
      <img
        src="https://prod-novu-app-bucket.s3.us-east-1.amazonaws.com/assets/email-editor/powered-by-novu.png"
        alt="Novu"
        className="h-3 object-contain"
      />
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
    <div className={cn('flex items-center justify-center pb-6 pt-4', className)} {...rest}>
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
          <TooltipTrigger type="button">{brandingContent}</TooltipTrigger>
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
