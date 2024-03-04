import { Center, Container, Loader, Tabs, TabsValue } from '@mantine/core';
import { useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import PageContainer from '../../../components/layout/components/PageContainer';
import PageHeader from '../../../components/layout/components/PageHeader';
import { useAuthContext } from '../../../components/providers/AuthProvider';
import { useSegment } from '../../../components/providers/SegmentProvider';
import { ROUTES } from '../../../constants/routes.enum';
import { colors, useTabsStyles, When } from '@novu/design-system';
import { useEnvController, useFeatureFlag } from '../../../hooks';
import { FeatureFlagsKeysEnum } from '@novu/shared';

const BRAND = 'Brand';
const LAYOUT = 'Layouts';

export function BrandPage() {
  const { currentOrganization, currentUser } = useAuthContext();
  const { environment } = useEnvController();
  const isInformationArchitectureEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_INFORMATION_ARCHITECTURE_ENABLED);

  const segment = useSegment();
  const { classes } = useTabsStyles(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const tabValue = useMemo(() => {
    return pathname === ROUTES.BRAND ? '/' : pathname.replace(ROUTES.BRAND, '');
  }, [pathname]);

  const handleLayoutAnalytics = (event: string, data?: Record<string, unknown>) => {
    segment.track(`[Layout] - ${event}`, {
      _organizationId: currentOrganization?._id,
      _environmentId: environment?._id,
      userId: currentUser?._id,
      ...data,
    });
  };

  const trackLayoutFocus = (value: TabsValue) => {
    if (value === LAYOUT && segment.isSegmentEnabled()) {
      handleLayoutAnalytics('Layout tab clicked');
    }
  };

  if (!currentOrganization) {
    return (
      <Center>
        <Loader color={colors.error} size={32} />
      </Center>
    );
  }

  const title = isInformationArchitectureEnabled && tabValue === '/layouts' ? LAYOUT : BRAND;

  return (
    <PageContainer title={title}>
      <PageHeader title={title} />
      <Container fluid px={30}>
        <When truthy={!isInformationArchitectureEnabled}>
          <Tabs
            orientation="horizontal"
            keepMounted={true}
            onTabChange={(newValue) => {
              trackLayoutFocus(newValue);
              navigate(ROUTES.BRAND + newValue);
            }}
            variant="default"
            value={tabValue}
            classNames={classes}
            mb={15}
          >
            <Tabs.List>
              <Tabs.Tab value="/">Assets</Tabs.Tab>
              <Tabs.Tab value="/layouts">Layouts</Tabs.Tab>
            </Tabs.List>
          </Tabs>
        </When>
        <Outlet
          context={{
            currentOrganization,
            handleLayoutAnalytics,
          }}
        />
      </Container>
    </PageContainer>
  );
}
