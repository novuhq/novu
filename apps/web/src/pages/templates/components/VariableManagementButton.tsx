import { Group, createStyles } from '@mantine/core';
import { useState } from 'react';
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
  openVariablesModal,
}: {
  label?: string;
  openVariablesModal: () => void;
}) => {
  const stepFormPath = useStepFormPath();
  const [openVariablesManagement, setOpenVariablesManagement] = useState<boolean>(false);
  const { classes } = usePopoverStyles();

  return (
    <Group position={'apart'}>
      <Text weight="bold">{label ?? 'Message content'}</Text>
      <Popover
        width={300}
        className={classes.dropdown}
        opened={openVariablesManagement}
        target={
          <ActionButton
            Icon={CurlyBrackets}
            onClick={() => setOpenVariablesManagement(!openVariablesManagement)}
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
            closeVariablesManagement={() => {
              setOpenVariablesManagement(false);
            }}
            path={`${stepFormPath}.template.variables`}
            openVariablesModal={() => {
              setOpenVariablesManagement(false);
              openVariablesModal();
            }}
          />
        }
        withArrow={false}
        position={'right-start'}
      />
    </Group>
  );
};
