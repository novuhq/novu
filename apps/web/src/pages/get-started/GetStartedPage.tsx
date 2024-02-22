import PageContainer from '../../components/layout/components/PageContainer';
import PageHeader from '../../components/layout/components/PageHeader';
import { GetStartedTabs } from './components/get-started-tabs/GetStartedTabs';
import { useAuthContext } from '../../components/providers/AuthProvider';
import { Center, Loader } from '@mantine/core';
import { colors } from '@novu/design-system';
import { useGetStartedTabs } from './components/get-started-tabs/useGetStartedTabs';

const PAGE_TITLE = 'Get started';

export function GetStartedPage() {
  const { currentOrganization } = useAuthContext();
  const { currentTab, setTab } = useGetStartedTabs();

  return (
    <PageContainer title={PAGE_TITLE}>
      <PageHeader title={PAGE_TITLE} />
      {currentOrganization ? (
        <GetStartedTabs currentTab={currentTab} setTab={setTab} />
      ) : (
        <Center>
          <Loader color={colors.error} size={32} />
        </Center>
      )}
    </PageContainer>
  );
}
