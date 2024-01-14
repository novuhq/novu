import React from 'react';
import styled from '@emotion/styled';

export function TabsLayout({ children }: { children: React.ReactNode }) {
  return <StyledTabs>{children}</StyledTabs>;
}

const StyledTabs = styled.div`
  height: 60px;
  padding: 20px 24px;
  display: flex;
  justify-content: center;
  flex-direction: column;
  margin-top: 15px;
  background: turquoise;
`;
