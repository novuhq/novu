import { Button, Text } from '../../../../design-system';
import { useState } from 'react';
import styled from '@emotion/styled';
import { useMutation } from 'react-query';
import { regenerateApiKeys } from '../../../../api/environment';
import { useEnvController } from '../../../../store/use-env-controller';
import { ConfirmRegenerationModal } from './ConfirmRegenerationModal';

export const Regenerate = () => {
  const { refetchEnvironment } = useEnvController();
  const [isModalOpened, setModalIsOpened] = useState(false);

  const { mutateAsync: regenerateApiKeysMutation } = useMutation<
    { key: string }[],
    { error: string; message: string; statusCode: number }
  >(regenerateApiKeys);

  async function regenerate() {
    await regenerateApiKeysMutation();
    await refetchEnvironment();
  }

  async function handleModal() {
    setModalIsOpened(true);
  }

  function cancelAction() {
    setModalIsOpened(false);
  }

  async function confirmAction() {
    await regenerate();
    setModalIsOpened(false);
  }

  return (
    <>
      <div>
        <Title>Regenerate API key</Title>
        <Button mb={20} mt={10} data-test-id="show-regenerate-api-key-modal" onClick={() => handleModal()}>
          Regenerate
        </Button>
      </div>
      <ConfirmRegenerationModal
        isOpen={isModalOpened}
        cancelAction={cancelAction}
        confirmAction={confirmAction}
      />
    </>
  );
};


const Title = styled(Text)`
  padding-bottom: 17px;
  font-size: 20px;
  font-weight: 700;
`;