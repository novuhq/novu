import { Modal, useMantineTheme } from '@mantine/core';
import { colors, shadows, Title, Text, Button } from '../../../design-system';
import { Center, Loader } from '@mantine/core';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { updateUserOnBoarding } from '../../../api/user';
import { IUserEntity } from '@novu/shared';
import { createTemplateFromBluePrintId, getBlueprintTemplateById } from '../../../api/notification-templates';
import { errorMessage } from '../../../utils/notifications';
import { When } from '../../../components/utils/When';
import { useSegment } from '../../../components/providers/SegmentProvider';

export function BlueprintModal() {
  const theme = useMantineTheme();
  const navigate = useNavigate();
  const segment = useSegment();
  const onClose = () => {
    segment.track('Blueprint canceled', {
      blueprintId: localStorage.getItem('blueprintId'),
    });
    navigate('/templates', {
      replace: true,
    });
    localStorage.removeItem('blueprintId');
  };

  const { mutateAsync: updateOnBoardingStatus } = useMutation<
    IUserEntity,
    { error: string; message: string; statusCode: number },
    { showOnBoarding: boolean }
  >(({ showOnBoarding }) => updateUserOnBoarding(showOnBoarding));

  async function disableOnboarding() {
    await updateOnBoardingStatus({ showOnBoarding: false });
  }

  const [blueprintId, setBluePrintId] = useState<undefined | string>();

  useEffect(() => {
    const id = localStorage.getItem('blueprintId');
    setBluePrintId(id === null ? undefined : id);
  }, [localStorage.getItem('blueprintId')]);

  const { data: blueprint, isInitialLoading: isBluePrintLoading } = useQuery(
    ['blueprint', blueprintId],
    () => getBlueprintTemplateById(blueprintId as string),
    {
      enabled: !!blueprintId,
      onError: onClose,
    }
  );

  const { mutate, isLoading: isCreating } = useMutation(createTemplateFromBluePrintId, {
    onSuccess: (template) => {
      if (template) {
        disableOnboarding();
        navigate(`/templates/edit/${template?._id}`, {
          replace: true,
        });
      }
      localStorage.removeItem('blueprintId');
    },
    onError: (err: any) => {
      if (err?.message) {
        errorMessage(err?.message);
      }
      onClose();
    },
  });

  const isLoading = isBluePrintLoading || isCreating;

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
        withCloseButton={!isLoading}
        closeOnClickOutside={!isLoading}
        title={
          <Title size={2}>
            {isBluePrintLoading ? 'Loading template' : `Create the ${blueprint?.name} notification flow!`}
          </Title>
        }
        sx={{ backdropFilter: 'blur(1px)' }}
        shadow={theme.colorScheme === 'dark' ? shadows.dark : shadows.medium}
        radius="md"
        size="lg"
        onClose={onClose}
      >
        <When truthy={isLoading}>
          <Center>
            <Loader color={colors.B70} mb={20} mt={20} size={32} />
          </Center>
        </When>
        <When truthy={!isLoading}>
          <Text mb={16}>Feel free to modify the flow by dragging and dropping steps onto the canvas.</Text>
          <Text weight="bold" data-test-id="blueprint-name" mb={16}>
            {blueprint?.name}:
          </Text>
          <Text data-test-id="blueprint-description" mb={16}>
            {blueprint?.description}
          </Text>
          <Button
            data-test-id="create-from-blueprint"
            onClick={() => {
              if (blueprintId) {
                mutate(blueprintId);
              }
            }}
          >
            Create the flow!
          </Button>
        </When>
      </Modal>
    </>
  );
}
