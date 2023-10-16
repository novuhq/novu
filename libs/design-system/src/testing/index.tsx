import styled from '@emotion/styled';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ThemeProvider } from '../ThemeProvider';
import { MemoryRouter } from 'react-router-dom';

const queryClient = new QueryClient();

export function TestWrapper({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Wrapper>
          <Frame>
            <ThemeProvider>{children}</ThemeProvider>
          </Frame>
        </Wrapper>
      </MemoryRouter>
    </QueryClientProvider>
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
