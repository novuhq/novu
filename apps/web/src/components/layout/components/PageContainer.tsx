import React, { CSSProperties } from 'react';
import { Container } from '../../../design-system';
import PageMeta from './PageMeta';

function PageContainer({
  children,
  title,
  style,
}: {
  children: React.ReactNode;
  title?: string;
  style?: CSSProperties;
}) {
  return (
    <Container pl={0} pr={0} fluid style={style}>
      <PageMeta title={title} />
      {children}
    </Container>
  );
}

export default PageContainer;
