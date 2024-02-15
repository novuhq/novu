import styled from '@emotion/styled';
import React from 'react';
import { colors } from '@novu/design-system';
import { InAppHeaderIcons } from '../common';

export function Header() {
  return (
    <ContainerStyled>
      <InAppHeaderIcons />
    </ContainerStyled>
  );
}

const ContainerStyled = styled.div`
  display: flex;
  padding: 8px 12px;
  justify-content: flex-end;
  align-items: center;
  align-self: stretch;
  border-radius: 0px 8px 0px 0px;
  background: linear-gradient(90deg, ${colors.B17} 0%, #24242d 48.44%, #292934 100%), #292933;
`;
