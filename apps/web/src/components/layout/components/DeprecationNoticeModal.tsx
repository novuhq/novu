import { Group, Modal, useMantineTheme } from '@mantine/core';
import { Button, colors, shadows, Title } from '@novu/design-system';
import { useEffect, useState } from 'react';
import { useSubscription } from '../../../ee/billing/hooks/useSubscription';
import { useAuth } from '../../../hooks/useAuth';
import { DeprecationDashboardNoticeContent } from './DeprecationDashboardNoticeContent';
import {
  buildMigrationGuideUrl,
  getDaysUntilDashboardDeprecation,
  LEGACY_DASHBOARD_DEPRECATION_MODAL_DISMISSED_KEY,
} from './deprecation-dashboard-notice';

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
  const { apiServiceLevel, isLoading } = useSubscription();
  const { currentOrganization } = useAuth();
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (!readDismissedFromStorage()) {
      setOpened(true);
    }
  }, [isLoading]);

  const handleDismiss = () => {
    persistDismissed();
    setOpened(false);
  };

  const migrationGuideUrl = buildMigrationGuideUrl(apiServiceLevel, currentOrganization);
  const daysLeft = getDaysUntilDashboardDeprecation();
  const timePhrase = daysLeft === 0 ? 'today' : `in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`;

  return (
    <Modal
      opened={opened}
      onClose={handleDismiss}
      fullScreen
      transition="fade"
      transitionDuration={200}
      withCloseButton
      closeOnClickOutside
      title={<Title size={2}>Legacy dashboard deprecation</Title>}
      overlayColor={theme.colorScheme === 'dark' ? colors.BGDark : colors.BGLight}
      overlayOpacity={0.85}
      sx={{ backdropFilter: 'blur(10px)' }}
      shadow={theme.colorScheme === 'dark' ? shadows.dark : shadows.medium}
      radius="md"
      styles={{
        root: {
          zIndex: 250,
        },
        inner: {
          padding: 0,
        },
        modal: {
          backgroundColor: theme.colorScheme === 'dark' ? colors.B15 : colors.white,
        },
        body: {
          padding: '48px 24px',
          maxWidth: 720,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          minHeight: '100vh',
          boxSizing: 'border-box',
        },
      }}
    >
      <DeprecationDashboardNoticeContent
        migrationGuideUrl={migrationGuideUrl}
        daysLeft={daysLeft}
        timePhrase={timePhrase}
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
