import { Modal } from '@novu/design-system';
import { FC } from 'react';
import { Button, Text, Title } from '@novu/novui';
import { css } from '@novu/novui/css';
import { HStack, Stack } from '@novu/novui/jsx';
import { CodeSnippet } from '../../pages/get-started/legacy-onboarding/components/CodeSnippet';
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
      title={<Title variant="section">Open local studio</Title>}
      onClose={toggleOpen}
      className={css({ colorPalette: 'mode.cloud' })}
    >
      <Stack gap="100">
        <Text color="typography.text.secondary">
          The Local Studio is where you can create your own workflows and expose no-code controls to your non-technical
          team-members. This command will run the Studio on your local machine
        </Text>

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
