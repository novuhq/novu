import { CellRendererComponent } from '@novu/novui';
import { css } from '@novu/novui/css';
import { IconBolt, IconCable, IconFlashOff } from '@novu/novui/icons';
import { Center, Flex, HStack, styled } from '@novu/novui/jsx';
import { text } from '@novu/novui/recipes';
import { ColorToken } from '@novu/novui/tokens';
import { WorkflowTableRow } from './WorkflowsTable.types';

export const GroupCell: CellRendererComponent<WorkflowTableRow, string> = (props) => {
  return (
    <Center
      className={css({
        color: 'typography.text.main',
        rounded: '50',
        border: 'solid',
        py: '25',
        px: '75',
        borderColor: 'badge.border',
        width: '[fit-content]',
        bg: '[transparent]',
      })}
    >
      {props.getValue()}
    </Center>
  );
};

const Text = styled('p', text);

export const NameCell: CellRendererComponent<WorkflowTableRow, string> = ({ getValue, row: { original } }) => {
  return (
    <HStack gap="50">
      {
        <IconCable
          className={css({ width: '200', height: '200', color: 'icon.secondary' })}
          title="workflow-row-label"
        />
      }
      <Flex direction={'column'}>
        <Text variant={'main'}>{original.workflowId}</Text>
      </Flex>
    </HStack>
  );
};

export const StatusCell: CellRendererComponent<WorkflowTableRow, boolean> = ({ getValue }) => {
  const isActive = getValue();
  getValue();
  const color: ColorToken = isActive ? 'status.active' : 'status.inactive';

  return (
    <HStack gap="0">
      {isActive ? (
        <IconBolt size="16" className={css({ color })} title="workflow-status-indicator" />
      ) : (
        <IconFlashOff size="16" className={css({ color })} title="workflow-status-indicator" />
      )}
      <Text variant={'main'} color={color}>
        {isActive ? 'Active' : 'Inactive'}
      </Text>
    </HStack>
  );
};
