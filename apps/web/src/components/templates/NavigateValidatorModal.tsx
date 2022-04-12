import React from 'react';
import { Group, Modal, useMantineTheme } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { Button, colors, shadows, Title, Text } from '../../design-system';

export function NavigateValidatorModal({
  isOpen,
  setModalVisibility,
  navigateRoute,
  navigateName,
}: {
  isOpen: boolean;
  setModalVisibility: (boolean) => void;
  navigateRoute: string;
  navigateName: string;
}) {
  const theme = useMantineTheme();
  const navigate = useNavigate();

  return (
    <>
      <Modal
        onClose={() => setModalVisibility(false)}
        opened={isOpen}
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
        title={<Title size={2}>Navigate to the {navigateName}?</Title>}
        sx={{ backdropFilter: 'blur(10px)' }}
        shadow={theme.colorScheme === 'dark' ? shadows.dark : shadows.medium}
        radius="md"
        size="lg"
      >
        <div>
          <Text>Any unsaved changes will be deleted. Proceed anyway?</Text>
          <Group position="right">
            <Button variant="outline" size="md" mt={30} onClick={() => setModalVisibility(false)}>
              No
            </Button>
            <Button mt={30} size="md" onClick={() => navigate(navigateRoute)}>
              Yes
            </Button>
          </Group>
        </div>
      </Modal>
    </>
  );
}
