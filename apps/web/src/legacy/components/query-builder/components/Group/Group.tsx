import React from 'react';
import ButtonGroup from 'antd/es/button/button-group';
import styled, { css } from 'styled-components';
import { Paper } from '../Component/Component';

export interface GroupProps {
  controlsLeft?: React.ReactNode | React.ReactNodeArray;
  controlsRight?: React.ReactNode | React.ReactNodeArray;
  children: React.ReactNode | React.ReactNodeArray;
  isRoot?: boolean;
  show?: boolean;
}

const Container = styled(Paper)`
  margin: 0.5rem 0;
  background-color: #f9f9f9;

  && {
    background-color: #f9f9f9;
`;

const Content = styled.div`
  padding: 1rem;
`;

const Header = styled.div`
  padding: 1rem 1rem 0;
  display: flex;
  justify-content: center;
`;

const Right = styled.div`
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: min-content;
  grid-auto-rows: min-content;
  align-items: center;
  justify-content: end;
  grid-gap: 0.5rem;
`;

export const Group: React.FC<GroupProps> = ({ children, controlsLeft, controlsRight, isRoot, show }: GroupProps) => {
  return (
    <Container hideBorder={isRoot}>
      {show && (
        <Header>
          <div style={{ textAlign: 'center' }}>
            <ButtonGroup>{controlsLeft}</ButtonGroup>
          </div>
        </Header>
      )}
      <Content>{children}</Content>
    </Container>
  );
};
