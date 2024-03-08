import { Group } from '@mantine/core';
import { Title, Container } from '@novu/design-system';

function PageHeader({ actions, title }: { actions?: JSX.Element; title: string }) {
  return (
    <Container fluid sx={{ padding: '20px 24px' }}>
      <Group position="apart">
        <Title>{title}</Title>
        {actions && <div>{actions}</div>}
      </Group>
    </Container>
  );
}

export default PageHeader;
