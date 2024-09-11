import { AppShell as MantineAppShell, Avatar, Box, Flex, Group, Paper } from '@mantine/core';
import { NovuInbox } from '../navigation/inbox';
import { Navigation } from './navigation';
import { NavigationBreadcrumbs } from './breadcrumbs';

const NAV_WIDTH_REM = 12.75; // 204px / 16
const HEADER_HEIGHT_REM = 2.5; // 40px / 16
const HEADER_PADDING_REM = 0.25; // 4px / 16 - "sm"

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <MantineAppShell
      withBorder={false}
      header={{ height: `${HEADER_HEIGHT_REM}rem` }}
      navbar={{
        width: `${NAV_WIDTH_REM}rem`,
        breakpoint: 'xs',
        collapsed: {
          desktop: false,
          mobile: false,
        },
      }}
    >
      <MantineAppShell.Header bg="black">
        <Group justify="space-between" w="100vw" pl="md" pr="sm">
          <NavigationBreadcrumbs />
          <Group gap="xs">
            <NovuInbox />
            <Avatar size="sm" />
          </Group>
        </Group>
      </MantineAppShell.Header>

      <MantineAppShell.Navbar p="sm" bg="black">
        <Navigation />
      </MantineAppShell.Navbar>

      <MantineAppShell.Main bg="black">
        <Paper
          bg="page"
          radius="lg"
          h={`calc(100vh - ${HEADER_HEIGHT_REM + HEADER_PADDING_REM * 2}rem)`}
          p="md"
          mb="sm"
          mr="sm"
        >
          {children}
        </Paper>
      </MantineAppShell.Main>
    </MantineAppShell>
  );
};
