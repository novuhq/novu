import { OrganizationProfile, UserProfile } from '@clerk/clerk-react';
import { Tabs } from '@mantine/core';
import { useNavigate, useParams } from 'react-router-dom';
import { BillingPage } from '../../billing/pages/BillingPage';

const _appearance = {
  elements: {
    navbar: { display: 'none' },
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

  return (
    <>
      <Tabs
        defaultValue="account"
        value={tabValue}
        onTabChange={(value) => navigate(`/manage-account/${value}`)}
        orientation="vertical"
      >
        <Tabs.List>
          <Tabs.Tab value="account">Account</Tabs.Tab>
          <Tabs.Tab value="security">Security</Tabs.Tab>
          <Tabs.Tab value="organization">Organization</Tabs.Tab>
          <Tabs.Tab value="team">Team</Tabs.Tab>
          <Tabs.Tab value="billing">Billing</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="account">
          <UserProfile appearance={_appearance}>
            <UserProfile.Page label="account" />
            <UserProfile.Page label="security" />
          </UserProfile>
        </Tabs.Panel>
        <Tabs.Panel value="security">
          <UserProfile appearance={_appearance}>
            <UserProfile.Page label="security" />
            <UserProfile.Page label="account" />
          </UserProfile>
        </Tabs.Panel>
        <Tabs.Panel value="organization">
          <OrganizationProfile appearance={_appearance}>
            <OrganizationProfile.Page label="general" />
            <OrganizationProfile.Page label="members" />
          </OrganizationProfile>
        </Tabs.Panel>
        <Tabs.Panel value="team">
          <OrganizationProfile appearance={_appearance}>
            <OrganizationProfile.Page label="members" />
            <OrganizationProfile.Page label="general" />
          </OrganizationProfile>
        </Tabs.Panel>
        <Tabs.Panel value="billing">
          <BillingPage />
        </Tabs.Panel>
      </Tabs>
    </>
  );
}
