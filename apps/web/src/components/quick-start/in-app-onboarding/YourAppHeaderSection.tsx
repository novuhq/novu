import styled from '@emotion/styled';
import { createStyles, Popover } from '@mantine/core';
import { colors, shadows, Bell, User } from '@novu/design-system';
import { SandboxNotificationCenter } from './SandboxNotificationCenter';

const useStyles = createStyles((theme) => ({
  dropdown: {
    padding: 0,
    maxHeight: 316,
    borderRadius: 7,
    boxShadow: theme.colorScheme === 'dark' ? shadows.dark : shadows.medium,
    border: 'none',
    backgroundColor: theme.colorScheme === 'dark' ? colors.B15 : colors.white,
  },
  arrow: {
    backgroundColor: theme.colorScheme === 'dark' ? colors.B15 : colors.white,
    border: 'none',
    boxShadow: theme.colorScheme === 'dark' ? shadows.dark : shadows.medium,
  },
}));

export function YourAppHeaderSection() {
  const { classes } = useStyles();

  return (
    <Wrapper>
      <div>
        <Popover
          classNames={{
            dropdown: classes.dropdown,
            arrow: classes.arrow,
          }}
          width={320}
          opened={true}
          position="bottom-end"
          arrowOffset={90}
          withArrow
          zIndex={3} // Fix for the dropdown being on the top of WEB notification-center dropdown
          middlewares={{ flip: false, shift: false }}
        >
          <Popover.Target>
            <div>
              <Bell color={colors.B60} />
            </div>
          </Popover.Target>
          <Popover.Dropdown>
            <SandboxNotificationCenter />
          </Popover.Dropdown>
        </Popover>
      </div>
      <div>
        <User />
      </div>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  height: 48px;
  width: 100%;
  background-color: transparent;
  padding: 15px 16px;
  gap: 32px;
`;
