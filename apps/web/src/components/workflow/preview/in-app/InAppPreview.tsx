import styled from '@emotion/styled';
import { Container } from '@novu/design-system';
import Content from './Content';
import { Header } from './Header';

export function InAppPreview() {
  return (
    <div>
      <ContainerStyled>
        <Header />
        <Content />
      </ContainerStyled>
    </div>
  );
}

const ContainerStyled = styled.div`
  display: flex;
  padding: 1rem 5rem;
  flex-direction: column;
  gap: 1rem;
`;
