import { Group } from '@mantine/core';
import { Title, Container } from '@novu/design-system';
import { Flex } from '@novu/novui/jsx';
import { DocsButton } from '../../docs/DocsButton';

function PageHeader({ actions, title }: { actions?: JSX.Element; title: string }) {
  return (
    <Container fluid sx={{ padding: '20px 24px' }}>
      <Group position="apart">
        <Flex align="center" gap="75">
          <Title>{title}</Title>
          <DocsButton />
        </Flex>
        {actions && <div>{actions}</div>}
      </Group>
    </Container>
  );
}

export default PageHeader;
