import { AppShell as MantineAppShell, Flex, Group } from '@mantine/core';
import { NovuInbox } from '../navigation/inbox';
import { Navigation } from './navigation';
import { NavigationBreadcrumbs } from './breadcrumbs';

const NAV_WIDTH = 204;
const HEADER_HEIGHT = 40;
const HEADER_PADDING_LEFT = 20;
const HEADER_PADDING_ALL = 4;

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <MantineAppShell
      header={{ height: HEADER_HEIGHT }}
      navbar={{
        width: NAV_WIDTH,
        breakpoint: 'xs',
        collapsed: {
          desktop: false,
          mobile: false,
        },
      }}
      padding={HEADER_PADDING_LEFT}
    >
      <MantineAppShell.Header p={HEADER_PADDING_ALL}>
        <Group>
          <Flex w={NAV_WIDTH - HEADER_PADDING_LEFT} pl={HEADER_PADDING_LEFT}>
            Organization
          </Flex>
          <Group justify="space-between" w={`calc(100% - ${NAV_WIDTH}px)`}>
            <NavigationBreadcrumbs />
            <Group>
              <NovuInbox />
            </Group>
          </Group>
        </Group>
      </MantineAppShell.Header>

      <MantineAppShell.Navbar p="xs">
        <Navigation />
      </MantineAppShell.Navbar>

      <MantineAppShell.Main>{children}</MantineAppShell.Main>
    </MantineAppShell>
  );
};
