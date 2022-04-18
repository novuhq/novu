import React from 'react';
import { Container } from '../../../design-system';
import PageMeta from './PageMeta';

function PageContainer({ children }: { children: React.ReactNode }) {
  return (
    <Container pl={0} pr={0} fluid>
      <PageMeta />
      {children}
    </Container>
  );
}

export default PageContainer;
