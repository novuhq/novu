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
import { MANAGE_ACCOUNT_ROUTE_SEGMENTS, ROUTES } from '../../../constants/routes';
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
      title={undefined}
      onClose={() => {
        navigate(ROUTES.WORKFLOWS);
      }}
    >
      <Tabs
        classNames={tabsStyles}
        value={tabValue}
        onTabChange={(value) => navigate(`${ROUTES.MANAGE_ACCOUNT_SEGMENT}${value}`)}
        orientation="vertical"
      >
        <Tabs.List>
          <Tabs.Tab disabled value="title" className={titleTab}>
            Settings
          </Tabs.Tab>
          <Tabs.Tab
            value={MANAGE_ACCOUNT_ROUTE_SEGMENTS.USER_PROFILE}
            className={normalTabStyle}
            icon={<IconManageAccounts className={tabIconStyle} />}
          >
            User profile
          </Tabs.Tab>
          <Tabs.Tab
            value={MANAGE_ACCOUNT_ROUTE_SEGMENTS.ACCESS_SECURITY}
            className={normalTabStyle}
            icon={<IconAdminPanelSettings className={tabIconStyle} />}
          >
            Access security
          </Tabs.Tab>
          <Tabs.Tab
            value={MANAGE_ACCOUNT_ROUTE_SEGMENTS.ORGANIZATION}
            className={normalTabStyle}
            icon={<IconRoomPreferences className={tabIconStyle} />}
          >
            Organization
          </Tabs.Tab>
          <Tabs.Tab
            value={MANAGE_ACCOUNT_ROUTE_SEGMENTS.TEAM_MEMBERS}
            className={normalTabStyle}
            icon={<IconGroups className={tabIconStyle} />}
          >
            Team members
          </Tabs.Tab>
          {!isV2Enabled && (
            <Tabs.Tab
              value={MANAGE_ACCOUNT_ROUTE_SEGMENTS.BRANDING}
              className={normalTabStyle}
              icon={<IconLocalActivity className={tabIconStyle} />}
            >
              Branding
            </Tabs.Tab>
          )}
          <Tabs.Tab
            value={MANAGE_ACCOUNT_ROUTE_SEGMENTS.BILLING}
            className={normalTabStyle}
            icon={<IconCreditCard className={tabIconStyle} />}
          >
            Plans & Billing
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value={MANAGE_ACCOUNT_ROUTE_SEGMENTS.USER_PROFILE}>
          <UserProfile appearance={clerkComponentAppearance}>
            <UserProfile.Page label="account" />
            <UserProfile.Page label="security" />
          </UserProfile>
        </Tabs.Panel>
        <Tabs.Panel value={MANAGE_ACCOUNT_ROUTE_SEGMENTS.ACCESS_SECURITY}>
          <UserProfile appearance={clerkComponentAppearance}>
            <UserProfile.Page label="security" />
            <UserProfile.Page label="account" />
          </UserProfile>
        </Tabs.Panel>
        <Tabs.Panel value={MANAGE_ACCOUNT_ROUTE_SEGMENTS.ORGANIZATION}>
          <OrganizationProfile appearance={clerkComponentAppearance}>
            <OrganizationProfile.Page label="general" />
            <OrganizationProfile.Page label="members" />
          </OrganizationProfile>
        </Tabs.Panel>
        <Tabs.Panel value={MANAGE_ACCOUNT_ROUTE_SEGMENTS.TEAM_MEMBERS}>
          <OrganizationProfile appearance={clerkComponentAppearance}>
            <OrganizationProfile.Page label="members" />
            <OrganizationProfile.Page label="general" />
          </OrganizationProfile>
        </Tabs.Panel>
        {!isV2Enabled && (
          <Tabs.Panel value={MANAGE_ACCOUNT_ROUTE_SEGMENTS.BRANDING}>
            <BrandingPage />
          </Tabs.Panel>
        )}
        <Tabs.Panel value={MANAGE_ACCOUNT_ROUTE_SEGMENTS.BILLING}>
          <Title className={billingTitle}>Plans & Billing</Title>
          <BillingPage />
        </Tabs.Panel>
      </Tabs>
    </Modal>
  );
}
