import './ManageAccountPage.css';
import { OrganizationProfile, UserProfile } from '@clerk/clerk-react';
import { useColorScheme } from '@novu/design-system';
import { Modal, Tabs } from '@mantine/core';
import {
  IconAdminPanelSettings,
  IconCreditCard,
  IconGroups,
  IconLocalActivity,
  IconManageAccounts,
  IconRoomPreferences,
} from '@novu/novui/icons';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '../../../constants/routes';
import { useFeatureFlag } from '../../../hooks/useFeatureFlag';
import { BrandingPage } from '../../../pages/brand/BrandingPage';
import { BillingPage } from '../../billing/pages/BillingPage';
import { Title } from '@novu/novui';
import { css } from '@novu/novui/css';

const clerkComponentAppearance = {
  elements: {
    navbar: { display: 'none' },
    navbarMobileMenuRow: { display: 'none !important' },
    cardBox: {
      display: 'block',
      width: '100%',
      height: '100%',
      boxShadow: 'none',
    },
  },
};

export default function ManageAccountPage() {
  const navigate = useNavigate();
  const { tabValue } = useParams();
  const isV2Enabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_V2_ENABLED);
  const { colorScheme } = useColorScheme();
  const headerColor = colorScheme === 'dark' ? 'rgb(255, 255, 255)' : 'rgb(33, 33, 38)';

  return (
    <Modal
      opened
      padding={8}
      title={undefined}
      onClose={() => {
        navigate(ROUTES.WORKFLOWS);
      }}
      size="90%"
    >
      <>
        <Tabs value={tabValue} onTabChange={(value) => navigate(`/manage-account/${value}`)} orientation="vertical">
          <Tabs.List>
            <Tabs.Tab
              disabled
              value="title"
              className={css({
                color: 'var(--nv-colors-typography-text-primary) !important',
                fontSize: 'var(--nv-font-sizes-150) !important',
                lineHeight: 'var(--nv-line-heights-175) !important',
                opacity: '1 !important',
                padding: '24px !important',
                '&:hover': {
                  color: 'var(--nv-colors-typography-text-primary) !important',
                  backgroundColor: 'unset !important',
                  borderColor: 'var(--nv-colors-surface-panel) !important',
                  cursor: 'unset !important',
                },
              })}
            >
              Settings
            </Tabs.Tab>
            <Tabs.Tab value="user-profile" icon={<IconManageAccounts />}>
              User profile
            </Tabs.Tab>
            <Tabs.Tab value="access-security" icon={<IconAdminPanelSettings />}>
              Access security
            </Tabs.Tab>
            <Tabs.Tab value="organization" icon={<IconRoomPreferences />}>
              Organization
            </Tabs.Tab>
            <Tabs.Tab value="team-members" icon={<IconGroups />}>
              Team members
            </Tabs.Tab>
            {!isV2Enabled && (
              <Tabs.Tab value="branding" icon={<IconLocalActivity />}>
                Branding
              </Tabs.Tab>
            )}
            <Tabs.Tab value="billing" icon={<IconCreditCard />}>
              Billing plans
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="user-profile">
            <UserProfile appearance={clerkComponentAppearance}>
              <UserProfile.Page label="account" />
              <UserProfile.Page label="security" />
            </UserProfile>
          </Tabs.Panel>
          <Tabs.Panel value="access-security">
            <UserProfile appearance={clerkComponentAppearance}>
              <UserProfile.Page label="security" />
              <UserProfile.Page label="account" />
            </UserProfile>
          </Tabs.Panel>
          <Tabs.Panel value="organization">
            <OrganizationProfile appearance={clerkComponentAppearance}>
              <OrganizationProfile.Page label="general" />
              <OrganizationProfile.Page label="members" />
            </OrganizationProfile>
          </Tabs.Panel>
          <Tabs.Panel value="team-members">
            <OrganizationProfile appearance={clerkComponentAppearance}>
              <OrganizationProfile.Page label="members" />
              <OrganizationProfile.Page label="general" />
            </OrganizationProfile>
          </Tabs.Panel>
          {!isV2Enabled && (
            <Tabs.Panel value="branding">
              <BrandingPage />
            </Tabs.Panel>
          )}
          <Tabs.Panel value="billing">
            <div className={css({ padding: '1.75rem 1.5rem 1.75rem 2rem' })}>
              <Title
                marginBottom="150"
                className={css({
                  fontFamily: 'var(--nv-fonts-system)',
                  fontWeight: 'var(--nv-font-weights-strong)',
                  fontSize: 'var(--nv-font-sizes-125)',
                  letterSpacing: '0',
                  textDecoration: 'none',
                  lineHeight: 'var(--nv-line-heights-175)',
                })}
                variant={'page'}
                color={headerColor}
              >
                Billing plans
              </Title>
              <BillingPage />
            </div>
          </Tabs.Panel>
        </Tabs>
      </>
    </Modal>
  );
}
