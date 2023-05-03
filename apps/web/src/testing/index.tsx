import styled from '@emotion/styled';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { SegmentProvider } from '../components/providers/SegmentProvider';
import { ThemeProvider } from '../design-system/ThemeProvider';

const queryClient = new QueryClient();

export function TestWrapper({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SegmentProvider>
        <Wrapper>
          <Frame>
            <ThemeProvider>{children}</ThemeProvider>
          </Frame>
        </Wrapper>
      </SegmentProvider>
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
