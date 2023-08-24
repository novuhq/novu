import { Center, Container, Loader, Tabs } from '@mantine/core';
import PageHeader from '../../components/layout/components/PageHeader';
import PageContainer from '../../components/layout/components/PageContainer';
import { ApiKeysCard } from './tabs';
import { Outlet } from 'react-router-dom';
import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useStyles from '../../design-system/tabs/Tabs.styles';
import { ROUTES } from '../../constants/routes.enum';
import { useAuthContext } from '../../components/providers/AuthProvider';
import { colors } from '../../design-system';

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

export function SettingsPage() {
  const { currentOrganization } = useAuthContext();
  const selfHosted = process.env.REACT_APP_DOCKER_HOSTED_ENV === 'true';
  const { classes } = useStyles(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
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
          <Tabs.Tab value="/permissions">Permissions</Tabs.Tab>
          <Tabs.Tab value="/sso">SSO</Tabs.Tab>
          <Tabs.Tab value="/data-integrations">Data Integrations</Tabs.Tab>
        </Tabs.List>
      </Tabs>
      <Outlet />
    </SettingsPageWrapper>
  );
}
