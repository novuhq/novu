import styled from '@emotion/styled';
import { ThemeProvider } from '../ThemeProvider';
import { MemoryRouter } from 'react-router-dom';

export function TestWrapper({ children }) {
  return (
    <MemoryRouter>
      <Wrapper>
        <Frame>
          <ThemeProvider>{children}</ThemeProvider>
        </Frame>
      </Wrapper>
    </MemoryRouter>
  );
}

const Frame = styled.div`
  min-width: 500px;
  display: inline-block;
`;

const Wrapper = styled.div`
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
`;
