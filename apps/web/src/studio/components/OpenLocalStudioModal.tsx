import { Modal } from '@novu/design-system';
import { FC } from 'react';
import { Button, Text, Title } from '@novu/novui';
import { CodeSnippet } from '../../pages/get-started/components/CodeSnippet';
import { css } from '@novu/novui/css';
import { HStack, Stack } from '@novu/novui/jsx';
import { useNavigateToLocalStudio } from '../hooks/useNavigateToLocalStudio';

type OpenLocalStudioModalProps = {
  isOpen: boolean;
  toggleOpen: () => void;
};

export const OpenLocalStudioModal: FC<OpenLocalStudioModalProps> = ({ isOpen, toggleOpen }) => {
  const { forceStudioNavigation } = useNavigateToLocalStudio();

  const handlePrimaryClick = () => {
    forceStudioNavigation();
    toggleOpen();
  };

  return (
    <Modal
      opened={isOpen}
      title={
        <>
          <Title variant="section">Open local studio</Title>
          <Text color="typography.text.secondary">Run the following command to start your local studio:</Text>
        </>
      }
      onClose={toggleOpen}
      className={css({ colorPalette: 'mode.cloud' })}
    >
      <Stack gap="100">
        <CodeSnippet command={'npx novu@latest dev'} />
        <HStack justify={'flex-end'}>
          <Button size={'md'} onClick={handlePrimaryClick} variant="outline">
            Open
          </Button>
        </HStack>
      </Stack>
    </Modal>
  );
};
