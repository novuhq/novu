import { OrganizationProfile } from '@clerk/clerk-react';
import { Appearance } from '@clerk/types';
import { PermissionsEnum } from '@novu/shared';
import { InfoIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@/components/primitives/tooltip';
import { useFetchOrganizationSettings } from '@/hooks/use-fetch-organization-settings';
import { useUpdateOrganizationSettings } from '@/hooks/use-update-organization-settings';
import { Protect } from '@/utils/protect';
import { NovuBrandingSwitch } from './novu-branding-switch';

export function OrganizationSettings({ clerkAppearance }: { clerkAppearance: Appearance }) {
  const { data: organizationSettings, isLoading: isLoadingSettings } = useFetchOrganizationSettings();
  const updateOrganizationSettings = useUpdateOrganizationSettings();

  const handleRemoveBrandingChange = (value: boolean) => {
    updateOrganizationSettings.mutate({
      removeNovuBranding: value,
    });
  };

  const removeNovuBranding = organizationSettings?.data?.removeNovuBranding;
  const isUpdating = updateOrganizationSettings.isPending;

  return (
    <div className="space-y-8">
      {/* Badges and Integrations Section */}
      <Protect permission={PermissionsEnum.ORG_SETTINGS_READ}>
        <div>
          <h1 className="text-label-sm text-text-strong mb-2">Branding & Integrations</h1>

          <div className="flex flex-col gap-7">
            {/* Remove branding setting */}
            <div className="flex flex-col border-t border-neutral-100 pt-4">
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <span className="text-label-xs text-text-strong">Remove Novu branding</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InfoIcon className="text-text-soft h-4 w-4 cursor-help" />
                    </TooltipTrigger>
                    <TooltipPortal>
                      <TooltipContent
                        side="right"
                        sideOffset={10}
                        hideWhenDetached
                        className="w-[220px] border-0 bg-white p-1 shadow-md"
                      >
                        <figure className="aspect-[3] w-full overflow-hidden rounded-md border border-gray-200">
                          <img
                            src="/images/novu-branding.png"
                            alt="Novu branding preview"
                            className="h-full w-full object-contain"
                          />
                        </figure>
                        <p className="mt-2 px-0.5 text-xs text-gray-500">
                          Novu branding appears at the bottom of your emails and in your inbox.
                        </p>
                      </TooltipContent>
                    </TooltipPortal>
                  </Tooltip>
                </div>
                <NovuBrandingSwitch
                  id="remove-branding"
                  value={removeNovuBranding}
                  onChange={handleRemoveBrandingChange}
                  isReadOnly={isLoadingSettings || isUpdating}
                />
              </div>
              <p className="text-label-xs text-text-soft mb-1">
                When enabled, removes Novu branding from your notifications.
              </p>
            </div>
          </div>
        </div>
      </Protect>

      {/* Organization Settings Section */}
      <div>
        <h1 className="text-label-sm text-text-strong mb-3">Organization Settings</h1>
        <OrganizationProfile appearance={clerkAppearance}>
          <OrganizationProfile.Page label="general" />
          <OrganizationProfile.Page label="members" />
        </OrganizationProfile>
      </div>
    </div>
  );
}
