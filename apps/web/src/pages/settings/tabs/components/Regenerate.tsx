import { Button, Text } from '../../../../design-system';
import { useState } from 'react';
import styled from '@emotion/styled';
import { useMutation } from 'react-query';
import { regenerateApiKeys } from '../../../../api/environment';
import { ConfirmRegenerationModal } from './ConfirmRegenerationModal';
import { showNotification } from '@mantine/notifications';

export const Regenerate = ({ fetchApiKeys }: { fetchApiKeys: () => void }) => {
  const [isModalOpened, setModalIsOpened] = useState(false);

  const { mutateAsync: regenerateApiKeysMutation } = useMutation<
    { key: string }[],
    { error: string; message: string; statusCode: number }
  >(regenerateApiKeys);

  async function handleModal() {
    setModalIsOpened(true);
  }

  function cancelAction() {
    setModalIsOpened(false);
  }

  async function confirmAction() {
    await regenerateApiKeysMutation();
    await fetchApiKeys();
    setModalIsOpened(false);
    showNotification({
      message: `Successfully regenerated API keys!`,
      color: 'green',
    });
  }

  return (
    <>
      <div>
        <Title>Danger Zone</Title>
        <Button
          mb={20}
          mt={10}
          data-test-id="show-regenerate-api-key-modal"
          onClick={() => handleModal()}
          variant={'outline'}
        >
          Regenerate API Key
        </Button>
      </div>
      <ConfirmRegenerationModal isOpen={isModalOpened} cancelAction={cancelAction} confirmAction={confirmAction} />
    </>
  );
};

const Title = styled(Text)`
  padding-bottom: 17px;
  font-size: 20px;
  font-weight: 700;
`;
