import React from 'react';

import { HeaderLayout } from './layout/HeaderLayout';
import PageContainer from '../../components/layout/components/PageContainer';
import PageHeader from '../../components/layout/components/PageHeader';
import { GetStartedTabs } from './components/GetStartedTabs';

export function GetStartedPage() {
  return (
    <>
      <PageContainer title="Get Started">
        <HeaderLayout>
          <PageHeader title="Get Started" />
        </HeaderLayout>
        <GetStartedTabs />
      </PageContainer>
    </>
  );
}
