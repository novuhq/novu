import React from 'react';
import styled from '@emotion/styled';

export function HeaderLayout({ children }: { children: React.ReactNode }) {
  return <StyledHeader>{children}</StyledHeader>;
}

const StyledHeader = styled.div`
  margin-top: 15px;
`;
