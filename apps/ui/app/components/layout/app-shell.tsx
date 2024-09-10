import { AppShell as MantineAppShell, Avatar, Box, Flex, Group, Paper } from '@mantine/core';
import { NovuInbox } from '../navigation/inbox';
import { Navigation } from './navigation';
import { NavigationBreadcrumbs } from './breadcrumbs';

const NAV_WIDTH_REM = 12.75; // 204px / 16
const HEADER_HEIGHT_REM = 2.5; // 40px / 16
const HEADER_PADDING_LEFT_REM = 1.25; // 20px / 16
const HEADER_PADDING_ALL_REM = 0.25; // 4px / 16

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
      <MantineAppShell.Header p={`${HEADER_PADDING_ALL_REM}rem`} pb={`${HEADER_PADDING_ALL_REM * 2}rem`} bg="black">
        <Group>
          <Flex w={`${NAV_WIDTH_REM - HEADER_PADDING_LEFT_REM}rem)`} pl={`${HEADER_PADDING_LEFT_REM}rem`}>
            Organization
          </Flex>
          <Group justify="space-between" w={`calc(100vw - ${NAV_WIDTH_REM - HEADER_PADDING_LEFT_REM}rem)`}>
            <NavigationBreadcrumbs />
            <Group gap="xs">
              <NovuInbox />
              <Avatar size="sm" />
            </Group>
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
          h={`calc(100vh - ${HEADER_HEIGHT_REM + HEADER_PADDING_ALL_REM * 2}rem)`}
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
