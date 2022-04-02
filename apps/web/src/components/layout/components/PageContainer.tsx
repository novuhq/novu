import React from 'react';
import { Container } from '../../../design-system';

function PageContainer({ children }: { children: React.ReactNode }) {
  return (
    <Container pl={0} pr={0} fluid>
      {children}
    </Container>
  );
}

export default PageContainer;
