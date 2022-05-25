import { Center, Group } from '@mantine/core';
import { Title, Container, Text, colors } from '../../design-system';
import { ArrowLeft } from '../../design-system/icons';
import { When } from '../utils/When';

function WorkflowPageHeader({
  actions,
  title,
  onGoBack,
  children = null,
}: {
  actions?: JSX.Element;
  title: string;
  onGoBack: () => void;
  children?: JSX.Element | null;
}) {
  return (
    <Container fluid sx={{ padding: '30px' }}>
      <Group position="apart">
        <div>
          <Title>{title}</Title>
          <Center mt={10} onClick={onGoBack} inline style={{ cursor: 'pointer' }}>
            <ArrowLeft color={colors.B60} />
            <Text ml={5} color={colors.B60}>
              Go Back
            </Text>
          </Center>
        </div>
        <When truthy={children !== null}>
          <div>{children}</div>
        </When>

        {actions && <div>{actions}</div>}
      </Group>
    </Container>
  );
}

export default WorkflowPageHeader;
