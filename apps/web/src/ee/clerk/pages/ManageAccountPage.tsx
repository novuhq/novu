import { OrganizationProfile, UserProfile } from '@clerk/clerk-react';
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
import {
  billingTitle,
  clerkComponentAppearance,
  modalStyles,
  normalTabStyle,
  tabIconStyle,
  tabsStyles,
  titleTab,
} from './ManageAccountPage.styles';

export default function ManageAccountPage() {
  const navigate = useNavigate();
  const { tabValue } = useParams();
  const isV2Enabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_V2_ENABLED);

  return (
    <Modal
      classNames={modalStyles}
      opened
      padding={8}
      title={undefined}
      onClose={() => {
        navigate(ROUTES.WORKFLOWS);
      }}
    >
      <Tabs
        classNames={tabsStyles}
        value={tabValue}
        onTabChange={(value) => navigate(`/manage-account/${value}`)}
        orientation="vertical"
      >
        <Tabs.List>
          <Tabs.Tab disabled value="title" className={titleTab}>
            Settings
          </Tabs.Tab>
          <Tabs.Tab
            value="user-profile"
            className={normalTabStyle}
            icon={<IconManageAccounts className={tabIconStyle} />}
          >
            User profile
          </Tabs.Tab>
          <Tabs.Tab
            value="access-security"
            className={normalTabStyle}
            icon={<IconAdminPanelSettings className={tabIconStyle} />}
          >
            Access security
          </Tabs.Tab>
          <Tabs.Tab
            value="organization"
            className={normalTabStyle}
            icon={<IconRoomPreferences className={tabIconStyle} />}
          >
            Organization
          </Tabs.Tab>
          <Tabs.Tab value="team-members" className={normalTabStyle} icon={<IconGroups className={tabIconStyle} />}>
            Team members
          </Tabs.Tab>
          {!isV2Enabled && (
            <Tabs.Tab value="branding" className={normalTabStyle} icon={<IconLocalActivity className={tabIconStyle} />}>
              Branding
            </Tabs.Tab>
          )}
          <Tabs.Tab value="billing" className={normalTabStyle} icon={<IconCreditCard className={tabIconStyle} />}>
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
          <Title marginBottom="150" className={billingTitle} variant={'page'}>
            Billing plans
          </Title>
          <BillingPage />
        </Tabs.Panel>
      </Tabs>
    </Modal>
  );
}
