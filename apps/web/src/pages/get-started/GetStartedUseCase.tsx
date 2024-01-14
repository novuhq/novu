import React from 'react';
import { Title } from '@mantine/core';

import { HeaderLayout } from './layout/HeaderLayout';
import { TabsLayout } from './layout/TabsLayout';
import { BodyLayout } from './layout/BodyLayout';
import { SetupSteps } from './layout/SetupSteps';
import { UseCaseDemo } from './layout/UseCaseDemo';
import PageContainer from '../../components/layout/components/PageContainer';

export function GetStartedUseCase() {
  return (
    <>
      <PageContainer title="Get Started">
        <HeaderLayout>
          <Title>Get started</Title>
        </HeaderLayout>
        <TabsLayout>
          <h1>In-app , Multi-channel, Digest, Delay. Translation</h1>
        </TabsLayout>
        <BodyLayout>
          <SetupSteps />
          <UseCaseDemo />
        </BodyLayout>
      </PageContainer>
    </>
  );
}
