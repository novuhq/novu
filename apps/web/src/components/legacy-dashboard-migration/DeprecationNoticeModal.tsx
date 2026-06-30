import { Group, Modal, useMantineTheme } from '@mantine/core';
import { Button, colors, shadows, Title } from '@novu/design-system';
import { useEffect, useState } from 'react';
import { DeprecationDashboardNoticeContent } from './DeprecationDashboardNoticeContent';
import { LEGACY_DASHBOARD_DEPRECATION_MODAL_DISMISSED_KEY } from './deprecation-notice';
import { useLegacyDashboardMigrationNotice } from './useLegacyDashboardMigrationNotice';

function readDismissedFromStorage(): boolean {
  try {
    return (
      typeof window !== 'undefined' && localStorage.getItem(LEGACY_DASHBOARD_DEPRECATION_MODAL_DISMISSED_KEY) === 'true'
    );
  } catch {
    return false;
  }
}

function persistDismissed(): void {
  try {
    localStorage.setItem(LEGACY_DASHBOARD_DEPRECATION_MODAL_DISMISSED_KEY, 'true');
  } catch {
    // private mode / quota
  }
}

export function DeprecationNoticeModal() {
  const theme = useMantineTheme();
  const { isEnabled, isLoading, daysLeft, timePhrase, deprecationDateLabel, migrationGuideUrl } =
    useLegacyDashboardMigrationNotice('deprecation_modal');
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    if (isLoading || !isEnabled) {
      return;
    }

    if (!readDismissedFromStorage()) {
      setOpened(true);
    }
  }, [isEnabled, isLoading]);

  const handleDismiss = () => {
    persistDismissed();
    setOpened(false);
  };

  if (isLoading || !isEnabled) {
    return null;
  }

  return (
    <Modal
      opened={opened}
      onClose={handleDismiss}
      withCloseButton
      closeOnClickOutside
      centered
      size="lg"
      radius="md"
      title={<Title size={2}>Legacy dashboard deprecation</Title>}
      overlayColor={theme.colorScheme === 'dark' ? colors.BGDark : colors.BGLight}
      overlayOpacity={0.7}
      sx={{ backdropFilter: 'blur(10px)' }}
      shadow={theme.colorScheme === 'dark' ? shadows.dark : shadows.medium}
      styles={{
        root: {
          zIndex: 250,
        },
        modal: {
          backgroundColor: theme.colorScheme === 'dark' ? colors.B15 : colors.white,
        },
        body: {
          paddingTop: 5,
        },
      }}
    >
      <DeprecationDashboardNoticeContent
        migrationGuideUrl={migrationGuideUrl}
        daysLeft={daysLeft}
        timePhrase={timePhrase}
        deprecationDateLabel={deprecationDateLabel}
        variant="modal"
      />
      <Group position="right" mt={32}>
        <Button size="md" onClick={handleDismiss} data-autofocus>
          Acknowledge & Close
        </Button>
      </Group>
    </Modal>
  );
}
