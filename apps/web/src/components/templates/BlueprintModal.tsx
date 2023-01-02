import { Modal, useMantineTheme } from '@mantine/core';
import { colors, shadows, Title, Text, Button } from '../../design-system';
import { Center, Loader } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getBlueprintTemplateById } from '../../api/templates';
import { When } from '../utils/When';

export function BluePrintModal({ blueprintId }: { blueprintId?: string }) {
  const theme = useMantineTheme();
  const navigate = useNavigate();
  const onClose = () => {
    localStorage.removeItem('blueprintId');
    navigate('/templates');
  };

  const { data: blueprint, isInitialLoading: isBluePrintLoading } = useQuery(
    ['blueprint', blueprintId],
    () => getBlueprintTemplateById(blueprintId as string),
    {
      enabled: !!blueprintId,
      onError: onClose,
    }
  );

  return (
    <>
      <Modal
        opened={blueprintId !== undefined}
        overlayColor={theme.colorScheme === 'dark' ? colors.BGDark : colors.BGLight}
        overlayOpacity={0.7}
        styles={{
          modal: {
            backgroundColor: theme.colorScheme === 'dark' ? colors.B15 : colors.white,
          },
          body: {
            paddingTop: '5px',
          },
          inner: {
            paddingTop: '180px',
          },
        }}
        withCloseButton={!isBluePrintLoading}
        closeOnClickOutside={!isBluePrintLoading}
        title={<Title size={2}>{isBluePrintLoading ? 'Loading template' : `Create ${blueprint?.name} template`}</Title>}
        sx={{ backdropFilter: 'blur(10px)' }}
        shadow={theme.colorScheme === 'dark' ? shadows.dark : shadows.medium}
        radius="md"
        size="lg"
        onClose={onClose}
      >
        <When truthy={isBluePrintLoading}>
          <Center>
            <Loader color={colors.B70} mb={20} mt={20} size={32} />
          </Center>
        </When>
        <When truthy={!isBluePrintLoading}>
          <Text>{blueprint?.description}</Text>
          <Button onClick={() => {}}>Create template</Button>
        </When>
      </Modal>
    </>
  );
}
