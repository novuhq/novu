import React from 'react';
import { Container } from '../../../design-system';

function PageContainer({ children }: { children: React.ReactNode }) {
  return <Container fluid>{children}</Container>;
}

export default PageContainer;
