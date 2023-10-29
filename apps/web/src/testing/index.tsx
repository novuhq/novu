import { ReactNode } from 'react';
import styled from '@emotion/styled';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, MemoryRouterProps } from 'react-router-dom';
import { ThemeProvider } from '@novu/design-system';

import { SegmentProvider } from '../components/providers/SegmentProvider';

const queryClient = new QueryClient();

export function TestWrapper({
  children,
  initialEntries,
}: {
  children: ReactNode;
  initialEntries?: MemoryRouterProps['initialEntries'];
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <SegmentProvider>
          <Wrapper>
            <Frame>
              <ThemeProvider>{children}</ThemeProvider>
            </Frame>
          </Wrapper>
        </SegmentProvider>
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
