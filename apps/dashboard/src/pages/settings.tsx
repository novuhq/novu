import { UserProfile as ClerkUserProfile, OrganizationProfile } from '@clerk/clerk-react';
import type { Appearance } from '@clerk/types';
import {
  ApiServiceLevelEnum,
  FeatureFlagsKeysEnum,
  FeatureNameEnum,
  GetSubscriptionDto,
  getFeatureForTierAsBoolean,
  PermissionsEnum,
} from '@novu/shared';
import { motion } from 'motion/react';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card } from '@/components/primitives/card';
import { InlineToast } from '@/components/primitives/inline-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/primitives/tabs';
import { OrganizationSettings } from '@/components/settings/organization-settings';
import { EE_AUTH_PROVIDER, IS_SELF_HOSTED } from '@/config';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useHasPermission } from '@/hooks/use-has-permission';
import { TeamMembers } from '@/utils/better-auth/components/team-members';
import { UserProfile as BetterAuthUserProfile } from '@/utils/better-auth/index';
import { ROUTES } from '@/utils/routes';
import { Plan } from '../components/billing/plan';
import { DashboardLayout } from '../components/dashboard-layout';
import { useFetchSubscription } from '../hooks/use-fetch-subscription';

const FADE_ANIMATION = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.15 },
} as const;

const getClerkComponentAppearance = (isRbacEnabled: boolean): Appearance => ({
  variables: {
    colorPrimary: 'hsl(var(--bg-surface))',
    colorText: 'rgba(82, 88, 102, 0.95)',
    fontSize: '14px',
  },
  elements: {
    navbar: { display: 'none' },
    navbarMobileMenuRow: { display: 'none !important' },
    rootBox: {
      width: '100%',
      height: '100%',
    },
    cardBox: {
      display: 'block',
      width: '100%',
      height: '100%',
      boxShadow: 'none',
    },

    pageScrollBox: {
      padding: '0 !important',
    },
    header: {
      display: 'none',
    },
    profileSection: {
      borderBottom: 'none',
      borderTop: '1px solid hsl(var(--neutral-100))',
    },
    profileSectionTitleText: {
      color: 'hsl(var(--text-strong))',
    },
    page: {
      padding: '0 5px',
    },
    selectButton__role: {
      visibility: isRbacEnabled ? 'visible' : 'hidden',
    },
    formFieldRow__role: {
      visibility: isRbacEnabled ? 'visible' : 'hidden',
    },
    apiKeys: 'py-1',
  },
});

export function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { subscription } = useFetchSubscription();
  const isRbacEnabledFlag = useFeatureFlag(FeatureFlagsKeysEnum.IS_RBAC_ENABLED, false);
  const isRbacEnabled = checkRbacEnabled(subscription, isRbacEnabledFlag);
  const has = useHasPermission();
  const hasBillingPermission = has({ permission: PermissionsEnum.BILLING_WRITE });

  const clerkAppearance = getClerkComponentAppearance(isRbacEnabled);
  const UserProfile = EE_AUTH_PROVIDER === 'clerk' ? ClerkUserProfile : BetterAuthUserProfile;

  function checkRbacEnabled(subscription: GetSubscriptionDto | undefined, featureFlag: boolean) {
    const apiServiceLevel = subscription?.apiServiceLevel || ApiServiceLevelEnum.FREE;
    const rbacFeatureEnabled = getFeatureForTierAsBoolean(
      FeatureNameEnum.ACCOUNT_ROLE_BASED_ACCESS_CONTROL_BOOLEAN,
      apiServiceLevel
    );

    return rbacFeatureEnabled && featureFlag;
  }

  const canShowBilling = !IS_SELF_HOSTED && hasBillingPermission;

  const currentTab =
    location.pathname === ROUTES.SETTINGS ? 'account' : location.pathname.split('/settings/')[1] || 'account';

  useEffect(() => {
    if (currentTab === 'billing' && !canShowBilling) {
      navigate(ROUTES.SETTINGS_ACCOUNT, { replace: true });
    }
  }, [currentTab, canShowBilling, navigate]);

  const handleTabChange = (value: string) => {
    switch (value) {
      case 'account':
        navigate(ROUTES.SETTINGS_ACCOUNT);
        break;
      case 'organization':
        navigate(ROUTES.SETTINGS_ORGANIZATION);
        break;
      case 'team':
        navigate(ROUTES.SETTINGS_TEAM);
        break;
      case 'billing':
        if (canShowBilling) {
          navigate(ROUTES.SETTINGS_BILLING);
        }

        break;
    }
  };

  return (
    <DashboardLayout headerStartItems={<h1 className="text-foreground-950">Settings</h1>}>
      <Tabs value={currentTab} onValueChange={handleTabChange} className="-mx-2 w-full">
        <TabsList align="center" variant="regular" className="border-t-transparent py-0!">
          <TabsTrigger variant="regular" value="account" size="xl">
            Account
          </TabsTrigger>
          <TabsTrigger variant="regular" value="organization" size="xl">
            Organization
          </TabsTrigger>
          <TabsTrigger variant="regular" value="team" size="xl">
            Team
          </TabsTrigger>

          {canShowBilling && (
            <TabsTrigger variant="regular" value="billing" size="xl">
              Billing
            </TabsTrigger>
          )}
        </TabsList>

        <div
          className={`mx-auto mt-1 px-1.5 ${currentTab === 'billing' && canShowBilling ? 'max-w-[1400px]' : 'max-w-[700px]'}`}
        >
          <TabsContent value="account" className="rounded-lg">
            <motion.div {...FADE_ANIMATION}>
              <Card className="border-none shadow-none">
                <div className="pb-6 pt-4 flex flex-col">
                  <UserProfile appearance={clerkAppearance}>
                    <UserProfile.Page label="account" />
                    <UserProfile.Page label="security" />
                  </UserProfile>

                  <h1 className="text-foreground mb-6 mt-10 text-xl font-semibold">Security</h1>
                  <UserProfile appearance={clerkAppearance}>
                    <UserProfile.Page label="security" />
                    <UserProfile.Page label="account" />
                  </UserProfile>
                </div>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="organization" className="rounded-lg">
            <motion.div {...FADE_ANIMATION}>
              <Card className="border-none shadow-none">
                <div className="pb-6 pt-4 flex flex-col">
                  {subscription?.apiServiceLevel === ApiServiceLevelEnum.FREE && canShowBilling && (
                    <InlineToast
                      title="Tip:"
                      description="Hide Novu branding from your notification channels by upgrading to a paid plan."
                      ctaLabel="Upgrade Plan"
                      onCtaClick={() =>
                        navigate(ROUTES.SETTINGS_BILLING + '?utm_source=organization_settings_upgrade_prompt')
                      }
                      className="mb-4"
                      variant="tip"
                    />
                  )}
                  <OrganizationSettings clerkAppearance={clerkAppearance} />
                </div>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="team" className="rounded-lg">
            <motion.div {...FADE_ANIMATION}>
              <Card className="border-none shadow-none">
                <div className={`pb-6 pt-4 flex flex-col ${isRbacEnabled ? 'show-role-column' : 'hide-role-column'}`}>
                  {isRbacEnabledFlag && !isRbacEnabled && canShowBilling && (
                    <InlineToast
                      title="Tip:"
                      description="Get role-based access control and add unlimited members by upgrading."
                      ctaLabel="Upgrade to Team"
                      onCtaClick={() => navigate(ROUTES.SETTINGS_BILLING + '?utm_source=team_members_upgrade_prompt')}
                      className="mb-4"
                      variant="tip"
                    />
                  )}
                  {EE_AUTH_PROVIDER === 'clerk' ? (
                    <OrganizationProfile appearance={clerkAppearance}>
                      <OrganizationProfile.Page label="general" />
                    </OrganizationProfile>
                  ) : (
                    <TeamMembers appearance={clerkAppearance} />
                  )}
                </div>
              </Card>
            </motion.div>
          </TabsContent>

          {canShowBilling && (
            <TabsContent value="billing" className="rounded-lg">
              <motion.div {...FADE_ANIMATION}>
                <Card className="border-none shadow-none">
                  <div className="pb-6 pt-4 flex flex-col">
                    <Plan />
                  </div>
                </Card>
              </motion.div>
            </TabsContent>
          )}
        </div>
      </Tabs>
    </DashboardLayout>
  );
}
