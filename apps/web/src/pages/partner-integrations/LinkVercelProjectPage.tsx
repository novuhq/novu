import { Stack } from '@mantine/core';

import { LinkProjectContainer } from './components/LinkProjectContainer';

import { PartnerIntegrationLayout } from '../../components/layout/components/PartnerIntegrationLayout';
import { Container, Text, Title, ThemeProvider } from '@novu/design-system';

export function LinkVercelProjectPage({ type }: { type: 'edit' | 'create' }) {
  return (
    <ThemeProvider>
      <PartnerIntegrationLayout>
        <Container mt={30} size="lg" p={10}>
          <Stack spacing="xl">
            <Stack spacing="xs">
              <Title>Link Vercel Projects to Novu</Title>
              <Text>Choose the projects to link with your Organizations</Text>
            </Stack>
            <LinkProjectContainer type={type} />
          </Stack>
        </Container>
      </PartnerIntegrationLayout>
    </ThemeProvider>
  );
}
