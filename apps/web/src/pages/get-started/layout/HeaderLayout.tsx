import React from 'react';
import styled from '@emotion/styled';

export function HeaderLayout({ children }: { children: React.ReactNode }) {
  return <StyledHeader>{children}</StyledHeader>;
}

const StyledHeader = styled.div`
  height: 60px;
  padding: 20px 24px;
  display: flex;
  justify-content: center;
  flex-direction: column;
  margin-top: 15px;
  background: greenyellow;
`;
