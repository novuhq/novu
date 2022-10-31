import { Box, Stack } from '@mantine/core';
import { PartnerIntegrationLayout } from '../../components/layout/components/PartnerIntegrationLayout';
import { LinkProjectContainer } from '../../components/partner-integrations/vercel/LinkProjectContainer';
import { Container, Title, Text } from '../../design-system';

export function LinkVercelProjectPage() {
  return (
    <PartnerIntegrationLayout>
      <Box>
        <img
          src="/static/images/logo-formerly-dark-bg.png"
          alt="logo"
          style={{ maxWidth: 150, marginTop: 5, marginLeft: 5 }}
        />
      </Box>
      <Container mt={30} size="lg" p={10}>
        <Stack spacing="xl">
          <Stack spacing="xs">
            <Title>Link Vercel Projects to Novu</Title>
            <Text>Choose the projects to link with your Organizations</Text>
          </Stack>
          <LinkProjectContainer />
        </Stack>
      </Container>
    </PartnerIntegrationLayout>
  );
}
