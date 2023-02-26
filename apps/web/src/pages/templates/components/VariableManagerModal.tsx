import { colors, shadows, Button } from '../../../design-system';
import { VariableManager } from './VariableManager';
import { Group, Modal, Title, useMantineTheme } from '@mantine/core';

export const VariableManagerModal = ({
  open,
  setOpen,
  index,
  variablesArray,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  index: number;
  variablesArray: Record<string, any>;
}) => {
  const theme = useMantineTheme();

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
      <VariableManager hideLabel={true} index={index} variablesArray={variablesArray} />
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
