import { Card } from '@/components/primitives/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/primitives/tabs';
import { OrganizationProfile, UserProfile } from '@clerk/clerk-react';
import { DashboardLayout } from '../components/dashboard-layout';
import { useNavigate, useLocation } from 'react-router-dom';
import { ROUTES } from '@/utils/routes';
import { Appearance } from '@clerk/types';
import { motion } from 'motion/react';
import { Plan } from '../components/billing/plan';

const FADE_ANIMATION = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.15 },
} as const;

const clerkComponentAppearance: Appearance = {
  variables: {
    colorPrimary: 'rgba(82, 88, 102, 0.95)',
    colorText: 'rgba(82, 88, 102, 0.95)',
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
      borderTop: 'none',
      borderBottom: '1px solid #e0e0e0',
    },
    page: {
      padding: '0 5px',
    },
  },
};

export function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const currentTab =
    location.pathname === ROUTES.SETTINGS ? 'account' : location.pathname.split('/settings/')[1] || 'account';

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
        navigate(ROUTES.SETTINGS_BILLING);
        break;
    }
  };

  return (
    <DashboardLayout headerStartItems={<h1 className="text-foreground-950">Settings</h1>}>
      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <TabsList align="center" variant="regular" className="border-t-0 !py-0">
          <TabsTrigger variant={'regular'} value="account">
            Account
          </TabsTrigger>
          <TabsTrigger variant={'regular'} value="organization">
            Organization
          </TabsTrigger>
          <TabsTrigger variant={'regular'} value="team">
            Team
          </TabsTrigger>

          <TabsTrigger variant={'regular'} value="billing">
            Billing
          </TabsTrigger>
        </TabsList>

        <div className={`mx-auto mt-1 px-1.5 ${currentTab === 'billing' ? 'max-w-[1100px]' : 'max-w-[700px]'}`}>
          <TabsContent value="account" className="rounded-lg">
            <motion.div {...FADE_ANIMATION}>
              <Card className="mx-auto border-none shadow-none">
                <UserProfile appearance={clerkComponentAppearance}>
                  <UserProfile.Page label="account" />
                  <UserProfile.Page label="security" />
                </UserProfile>

                <h1 className="text-foreground mb-6 mt-10 text-xl font-semibold">Security</h1>
                <UserProfile appearance={clerkComponentAppearance}>
                  <UserProfile.Page label="security" />
                  <UserProfile.Page label="account" />
                </UserProfile>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="organization" className="rounded-lg">
            <motion.div {...FADE_ANIMATION}>
              <Card className="border-none shadow-none">
                <OrganizationProfile appearance={clerkComponentAppearance}>
                  <OrganizationProfile.Page label="general" />
                  <OrganizationProfile.Page label="members" />
                </OrganizationProfile>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="team" className="rounded-lg">
            <motion.div {...FADE_ANIMATION}>
              <Card className="border-none shadow-none">
                <OrganizationProfile appearance={clerkComponentAppearance}>
                  <OrganizationProfile.Page label="members" />
                  <OrganizationProfile.Page label="general" />
                </OrganizationProfile>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="billing" className="rounded-lg">
            <motion.div {...FADE_ANIMATION}>
              <Card className="border-none shadow-none">
                <Plan />
              </Card>
            </motion.div>
          </TabsContent>
        </div>
      </Tabs>
    </DashboardLayout>
  );
}
