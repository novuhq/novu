/** biome-ignore-all lint/correctness/useUniqueElementIds: expected */
import { OrganizationProfile } from '@clerk/react';
import type { ClerkAppearanceTheme } from '@clerk/shared/types';
import { PermissionsEnum } from '@novu/shared';
import { useState } from 'react';
import { RiInformation2Line } from 'react-icons/ri';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@/components/primitives/tooltip';
import { EE_AUTH_PROVIDER } from '@/config';
import { useFetchOrganizationSettings } from '@/hooks/use-fetch-organization-settings';
import { useUpdateOrganizationSettings } from '@/hooks/use-update-organization-settings';
import { OrganizationSettings as BetterAuthOrganizationSettings } from '@/utils/better-auth/components/organization-settings';
import { Protect } from '@/utils/protect';
import { ROUTES } from '@/utils/routes';
import { NovuBrandingSwitch } from './novu-branding-switch';

// After deleting (or leaving) an org, Clerk falls back to `<ClerkProvider signInUrl>` when this
// prop is unset. On the Connect host that points to Platform's sign-in, which kicks the
// user out of Connect entirely — they'd land on Platform's picker even when they still have
// Connect work to do. Pinning it to the local `/auth/organization-list` keeps them on the
// current product; `AuthProvider` then clears any cross-product org Clerk auto-activates and
// the picker renders the right product's empty state.
const AFTER_LEAVE_ORG_URL = ROUTES.SIGNUP_ORGANIZATION_LIST;

// `<OrganizationProfile>` from `@clerk/react` uses hash-based routing when no `path` is provided,
// so its internal pages live at `#/<route>` (e.g. `#/organization-security`). We drive that hash
// directly instead of React Router, since these are Clerk routes, not app routes.
const ORGANIZATION_SECURITY_HASH = '/organization-security';
const ORGANIZATION_GENERAL_HASH = '/';

type OrganizationProfileTab = 'general' | 'security';

function getOrganizationProfileTabClass(isActive: boolean) {
  if (isActive) {
    return 'text-text-strong border-neutral-950';
  }

  return 'text-text-soft border-transparent hover:text-text-strong';
}

export function OrganizationSettings({ clerkAppearance }: { clerkAppearance: ClerkAppearanceTheme }) {
  const { data: organizationSettings, isLoading: isLoadingSettings } = useFetchOrganizationSettings();
  const updateOrganizationSettings = useUpdateOrganizationSettings();

  const handleRemoveBrandingChange = (value: boolean) => {
    updateOrganizationSettings.mutate({
      removeNovuBranding: value,
    });
  };

  const removeNovuBranding = organizationSettings?.data?.removeNovuBranding;
  const isUpdating = updateOrganizationSettings.isPending;

  // The self-serve SSO "Security" page is not a mountable `<OrganizationProfile.Page>`
  // (valid labels are only general/members/billing/apiKeys). Clerk auto-injects it into the
  // OrganizationProfile router when self-serve SSO is enabled for the environment and the org.
  // Keep Clerk's embedded navbar hidden and drive its hash routes from Novu's own sub-tabs.
  const [activeTab, setActiveTab] = useState<OrganizationProfileTab>(() =>
    window.location.hash.includes('organization-security') ? 'security' : 'general'
  );

  const handleOrganizationProfileTabChange = (tab: OrganizationProfileTab) => {
    setActiveTab(tab);
    // Assigning to `window.location.hash` fires a `hashchange` event, which Clerk's hash router
    // listens for (React Router's `navigate` uses `pushState` and would not notify Clerk).
    window.location.hash = tab === 'security' ? ORGANIZATION_SECURITY_HASH : ORGANIZATION_GENERAL_HASH;
  };

  return (
    <div className="space-y-8">
      {/* Badges and Integrations Section */}
      <Protect permission={PermissionsEnum.ORG_SETTINGS_READ}>
        <div>
          <h1 className="text-label-sm text-text-strong mb-2">Branding & Integrations</h1>

          <div className="flex flex-col gap-7">
            {/* Remove branding setting */}
            <div className="flex flex-col border-t border-neutral-100 pt-4 pl-1">
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-1">
                  <span className="text-label-sm text-text-strong">Remove Novu branding</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <RiInformation2Line className="size-4 text-text-soft cursor-help" />
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
              <p className="text-paragraph-sm text-text-soft mb-1">
                When enabled, removes Novu branding from your notifications and agent messages.
              </p>
            </div>
          </div>
        </div>
      </Protect>

      {/* Organization Settings Section */}
      <div>
        <h1 className="text-label-sm text-text-strong mb-3">Organization Settings</h1>
        {EE_AUTH_PROVIDER === 'clerk' ? (
          <>
            <div className="mb-4 flex gap-4 border-b border-neutral-100">
              <button
                type="button"
                className={`text-label-sm border-b px-0 pb-2 ${getOrganizationProfileTabClass(activeTab === 'general')}`}
                onClick={() => handleOrganizationProfileTabChange('general')}
              >
                General
              </button>
              <button
                type="button"
                className={`text-label-sm border-b px-0 pb-2 ${getOrganizationProfileTabClass(activeTab === 'security')}`}
                onClick={() => handleOrganizationProfileTabChange('security')}
              >
                Security
              </button>
            </div>
            <OrganizationProfile appearance={clerkAppearance} afterLeaveOrganizationUrl={AFTER_LEAVE_ORG_URL} />
          </>
        ) : (
          <BetterAuthOrganizationSettings />
        )}
      </div>
    </div>
  );
}
