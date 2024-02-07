import React from 'react';

import { HeaderLayout } from './layout/HeaderLayout';
import PageContainer from '../../components/layout/components/PageContainer';
import PageHeader from '../../components/layout/components/PageHeader';
import { GetStartedTabs } from './components/get-started-tabs/GetStartedTabs';

const PAGE_TITLE = 'Get started';

export function GetStartedPage() {
  return (
    <PageContainer title={PAGE_TITLE}>
      <HeaderLayout>
        <PageHeader title={PAGE_TITLE} />
      </HeaderLayout>
      <GetStartedTabs />
    </PageContainer>
  );
}
