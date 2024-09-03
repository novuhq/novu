import { AppShell as MantineAppShell, Flex, Group } from '@mantine/core';
import { NovuInbox } from '../navigation/inbox';
import { Navigation } from './navigation';

const NAV_WIDTH = 204;
const HEADER_HEIGHT = 40;
const HEADER_PADDING = 10;

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
      padding={HEADER_PADDING}
    >
      <MantineAppShell.Header p={4} pl={20}>
        <Group justify="space-between">
          <Flex w={NAV_WIDTH - HEADER_PADDING}>Organization</Flex>
          <Flex>
            <NovuInbox />
          </Flex>
        </Group>
      </MantineAppShell.Header>

      <MantineAppShell.Navbar p="xs">
        <Navigation />
      </MantineAppShell.Navbar>

      <MantineAppShell.Main>{children}</MantineAppShell.Main>
    </MantineAppShell>
  );
};
