import React, { CSSProperties } from 'react';
import { Container } from '../../../design-system';
import { HEADER_HEIGHT } from '../constants';
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
  const containerStyle = {
    borderRadius: 0,
    ...style,
  };

  return (
    <Container pl={0} pr={0} fluid style={containerStyle} h={`calc(100% - ${HEADER_HEIGHT}px)`}>
      <PageMeta title={title} />
      {children}
    </Container>
  );
}

export default PageContainer;
