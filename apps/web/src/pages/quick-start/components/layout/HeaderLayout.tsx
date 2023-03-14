import React from 'react';
import styled from '@emotion/styled';

import { colors, Text, Title } from '../../../../design-system';

export function HeaderLayout() {
  return (
    <StyledHeader>
      <HeaderTitle>Set-up steps to get started</HeaderTitle>
      <HeaderSecondaryTitle>Quick Start Guide</HeaderSecondaryTitle>
    </StyledHeader>
  );
}

const HeaderTitle = styled(Text)`
  height: 32px;
  font-size: 20px;
  color: ${colors.B40};

  display: flex;
  align-items: center;

  margin-bottom: 4px;
`;

const HeaderSecondaryTitle = styled(Title)`
  height: 48px;
  font-size: 40px;
  color: ${colors.B40};

  display: flex;
  align-items: center;
`;

const StyledHeader = styled.div`
  height: 200px;

  display: flex;
  justify-content: center;
  align-items: center;

  flex-direction: column;
`;
