import React from 'react';
import { Container } from '@mantine/core';
import PageHeader from '../../components/layout/components/PageHeader';
import PageContainer from '../../components/layout/components/PageContainer';

export function IntegrationsStore() {
  return (
    <PageContainer>
      <PageHeader title="Integration Store" />
      <Container fluid mt={15} ml={5} />
    </PageContainer>
  );
}
