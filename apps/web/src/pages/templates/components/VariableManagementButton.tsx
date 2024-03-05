import { Group, createStyles } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';

import { Text, CurlyBrackets, ActionButton, Popover } from '@novu/design-system';

import { useStepFormPath } from '../hooks/useStepFormPath';
import { VariablesManagement } from './email-editor/variables-management/VariablesManagement';

const usePopoverStyles = createStyles(() => ({
  dropdown: {
    padding: '0px !important',
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    height: '70%',
    borderColor: 'transparent',
  },
}));

export const VariableManagementButton = ({
  label,
  openEditVariablesModal,
}: {
  label?: string;
  openEditVariablesModal: () => void;
}) => {
  const stepFormPath = useStepFormPath();
  const [variablesManagementOpen, { close: closeVariablesManagement, toggle: toggleVariablesManagement }] =
    useDisclosure(false);
  const { classes } = usePopoverStyles();

  return (
    <Group position={'apart'}>
      <Text weight="bold">{label ?? 'Message content'}</Text>
      <Popover
        width={300}
        className={classes.dropdown}
        opened={variablesManagementOpen}
        target={
          <ActionButton
            Icon={CurlyBrackets}
            data-test-id="open-variable-management"
            onClick={toggleVariablesManagement}
            tooltip="Open variables panel"
            sx={{
              '> svg': {
                width: 16,
                height: 12,
              },
            }}
          />
        }
        content={
          <VariablesManagement
            isPopover
            closeVariablesManagement={closeVariablesManagement}
            path={`${stepFormPath}.template.variables`}
            openVariablesModal={() => {
              closeVariablesManagement();
              openEditVariablesModal();
            }}
          />
        }
        withArrow={false}
        position={'right-start'}
      />
    </Group>
  );
};
