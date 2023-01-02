import { Modal, useMantineTheme } from '@mantine/core';
import { colors, shadows, Title, Text, Button } from '../../design-system';
import { Center, Loader } from '@mantine/core';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createTemplateFromBluePrintId, getBlueprintTemplateById } from '../../api/templates';
import { When } from '../utils/When';
import { ActivePageEnum } from '../../pages/templates/editor/TemplateEditorPage';
import { errorMessage } from '../../utils/notifications';

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

  const { mutate, isLoading: isCreating } = useMutation(createTemplateFromBluePrintId, {
    onSuccess: (template, ...args) => {
      console.log(template, args);
      localStorage.removeItem('blueprintId');
      if (template) {
        navigate(`/templates/edit/${template?._id}?page=${ActivePageEnum.WORKFLOW}`);
      }
    },
    onError: (err: any) => {
      if (err?.message) {
        errorMessage(err?.message);
      }
      onClose();
    },
  });

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
        withCloseButton={!isBluePrintLoading && !isCreating}
        closeOnClickOutside={!isBluePrintLoading && !isCreating}
        title={<Title size={2}>{isBluePrintLoading ? 'Loading template' : `Create ${blueprint?.name} template`}</Title>}
        sx={{ backdropFilter: 'blur(10px)' }}
        shadow={theme.colorScheme === 'dark' ? shadows.dark : shadows.medium}
        radius="md"
        size="lg"
        onClose={onClose}
      >
        <When truthy={isBluePrintLoading || isCreating}>
          <Center>
            <Loader color={colors.B70} mb={20} mt={20} size={32} />
          </Center>
        </When>
        <When truthy={!isBluePrintLoading && !isCreating}>
          <Text>{blueprint?.description}</Text>
          <Button
            onClick={() => {
              if (blueprintId) {
                mutate(blueprintId);
              }
            }}
          >
            Create template
          </Button>
        </When>
      </Modal>
    </>
  );
}
