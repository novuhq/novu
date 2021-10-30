import React from 'react';
import styled, { css } from 'styled-components';

export interface ComponentProps {
  children: React.ReactNode | React.ReactNodeArray;
  controls: React.ReactNode | React.ReactNodeArray;
  className?: string;
}

export const Paper = styled.div<{ hideBorder?: boolean }>`
  background-color: #ffffff;

  ${({ hideBorder }) => {
    return hideBorder
      ? css`
          border: none;
        `
      : css`
          border: 1px solid #edf2f9 !important;
        `;
  }}
`;

const Container = styled(Paper)`
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  margin: 0.5rem 0;
`;

const Content = styled.div`
  padding: 1rem;
  display: grid;
  grid-auto-columns: max-content;
  grid-auto-flow: column;
  grid-gap: 0.5rem;
`;

const Header = styled.div`
  padding: 1rem;
  display: grid;
  grid-auto-columns: max-content;
  grid-auto-flow: column;
  justify-content: flex-end;
`;

export const Component: React.FC<ComponentProps> = ({ children, controls, ...rest }: ComponentProps) => (
  <Container {...rest}>
    <Content>{children}</Content>
    <Header>{controls}</Header>
  </Container>
);
