import { colors, shadows, Button } from '@novu/design-system';
import { VariableManager } from './VariableManager';
import { Group, Modal, Title, useMantineTheme } from '@mantine/core';
import { useStepFormPath } from '../hooks/useStepFormPath';

export const EditVariablesModal = ({
  open,
  setOpen,
  variablesArray,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  variablesArray: Record<string, any>;
}) => {
  const theme = useMantineTheme();
  const stepFormPath = useStepFormPath();

  return (
    <Modal
      opened={open}
      overlayColor={theme.colorScheme === 'dark' ? colors.BGDark : colors.BGLight}
      overlayOpacity={0.7}
      styles={{
        modal: {
          backgroundColor: theme.colorScheme === 'dark' ? colors.B15 : colors.white,
          width: '90%',
        },
        body: {
          paddingTop: '5px',
          paddingInline: '8px',
        },
      }}
      title={<Title>Variables</Title>}
      sx={{ backdropFilter: 'blur(10px)' }}
      shadow={theme.colorScheme === 'dark' ? shadows.dark : shadows.medium}
      radius="md"
      size="lg"
      onClose={() => {
        setOpen(false);
      }}
      centered
      overflow="inside"
    >
      <VariableManager hideLabel={true} variablesArray={variablesArray} path={`${stepFormPath}.template`} />
      <Group position="right">
        <Button
          data-test-id="close-var-manager-modal"
          mt={30}
          onClick={() => {
            setOpen(false);
          }}
        >
          Close
        </Button>
      </Group>
    </Modal>
  );
};
