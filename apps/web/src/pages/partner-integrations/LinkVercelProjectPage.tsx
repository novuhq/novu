import { Stack } from '@mantine/core';

import { LinkProjectContainer } from './components/LinkProjectContainer';

import { PartnerIntegrationLayout } from '../../components/layout/components/PartnerIntegrationLayout';
import { Container, Text, Title } from '@novu/design-system';

export function LinkVercelProjectPage({ type }: { type: 'edit' | 'create' }) {
  return (
    <PartnerIntegrationLayout>
      <Container mt={30} size="md" p={24}>
        <Stack spacing="xl">
          <Stack spacing="xs">
            <Title>Link Vercel Projects to Novu</Title>
            <Text>Choose the projects to link with your Organizations</Text>
          </Stack>
          <LinkProjectContainer type={type} />
        </Stack>
      </Container>
    </PartnerIntegrationLayout>
  );
}
