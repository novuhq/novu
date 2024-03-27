import styled from '@emotion/styled';
import React, { CSSProperties } from 'react';
import { Container } from '../container/Container';
import { PageMeta } from './PageMeta';

export function PageContainer({
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
    <StyledContainer fluid style={containerStyle} h={`100%`}>
      <PageMeta title={title} />
      {children}
    </StyledContainer>
  );
}

const StyledContainer = styled(Container)`
  overflow-y: auto !important;
  border-radius: 0;
  padding-left: 0;
  padding-right: 0;
  margin: 0;
`;
