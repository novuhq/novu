import styled from '@emotion/styled';
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
    <StyledContainer pl={0} pr={0} fluid style={containerStyle} h={`calc(100vh - ${HEADER_HEIGHT}px)`}>
      <PageMeta title={title} />
      {children}
    </StyledContainer>
  );
}

export default PageContainer;

const StyledContainer = styled(Container)`
  overflow-y: auto;
  border-radius: 0;
  padding-left: 0;
  padding-right: 0;
`;
