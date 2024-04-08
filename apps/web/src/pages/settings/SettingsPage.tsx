import { Center, Container, Loader, Tabs } from '@mantine/core';
import PageHeader from '../../components/layout/components/PageHeader';
import PageContainer from '../../components/layout/components/PageContainer';
import { ApiKeysCard } from './tabs';
import { Outlet } from 'react-router-dom';
import { useMemo } from 'react';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants/routes.enum';
import { useAuthContext } from '../../components/providers/AuthProvider';
import { When, colors, useTabsStyles } from '@novu/design-system';
import { useFeatureFlag } from '../../hooks';

const SettingsPageWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <PageContainer title="Settings">
      <PageHeader title="Settings" />
      <Container fluid mt={15} ml={5}>
        {children}
      </Container>
    </PageContainer>
  );
};

/** @deprecated Use `SettingsPageNew` instead */
export function SettingsPage() {
  const { currentOrganization } = useAuthContext();
  const selfHosted = process.env.REACT_APP_DOCKER_HOSTED_ENV === 'true';
  const { classes } = useTabsStyles(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const billingEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_BILLING_ENABLED);
  const isInformationArchitectureEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_INFORMATION_ARCHITECTURE_ENABLED);

  const value = useMemo(() => {
    return pathname === ROUTES.SETTINGS ? '/' : pathname.replace(ROUTES.SETTINGS, '');
  }, [pathname]);

  if (!currentOrganization) {
    return (
      <Center>
        <Loader color={colors.error} size={32} />
      </Center>
    );
  }

  if (selfHosted) {
    return (
      <SettingsPageWrapper>
        <ApiKeysCard />
      </SettingsPageWrapper>
    );
  }

  return (
    <SettingsPageWrapper>
      <Tabs
        orientation="horizontal"
        keepMounted={true}
        onTabChange={(tabValue) => {
          navigate(ROUTES.SETTINGS + tabValue);
        }}
        variant="default"
        value={value}
        classNames={classes}
        mb={15}
      >
        <Tabs.List>
          <Tabs.Tab value="/">API Keys</Tabs.Tab>
          <Tabs.Tab value="/email">Email Settings</Tabs.Tab>
          <When truthy={billingEnabled}>
            <Tabs.Tab value="/billing">Billing</Tabs.Tab>
          </When>
          <When truthy={isInformationArchitectureEnabled}>
            <Tabs.Tab value="/brand">Branding</Tabs.Tab>
            <Tabs.Tab value="/team">Team Members</Tabs.Tab>
          </When>
          <Tabs.Tab value="/permissions">Permissions</Tabs.Tab>
          <Tabs.Tab value="/sso">SSO</Tabs.Tab>
          <Tabs.Tab value="/data-integrations">Data Integrations</Tabs.Tab>
        </Tabs.List>
      </Tabs>
      <Outlet
        context={{
          currentOrganization,
        }}
      />
    </SettingsPageWrapper>
  );
}
