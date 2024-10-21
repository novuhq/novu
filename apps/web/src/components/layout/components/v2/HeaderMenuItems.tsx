import { ActionIcon, Avatar } from '@mantine/core';
import { colors, Dropdown, IconLogout, IconOutlineGroupAdd, IconSettings, Text, When } from '@novu/design-system';
import { Link } from 'react-router-dom';
import { CONTEXT_PATH, IS_SELF_HOSTED, REACT_APP_VERSION } from '../../../../config';
import { ROUTES } from '../../../../constants/routes';
import { useAuth } from '../../../../hooks/useAuth';
import { useIsDarkTheme } from '../../../../hooks';
import { ProfileMenuItem } from './ProfileMenuItem';

const FALLBACK_AVATAR = `${CONTEXT_PATH}/static/images/avatar.webp`;

const menuItems = [
  {
    title: 'Settings',
    icon: <IconSettings color="inherit" />,
    path: ROUTES.SETTINGS,
  },
  {
    title: 'Invite members',
    icon: <IconOutlineGroupAdd color="inherit" />,
    path: ROUTES.TEAM,
  },
];

export function HeaderMenuItems({}) {
  const { currentOrganization, currentUser, logout } = useAuth();

  const isDark = useIsDarkTheme();
  const iconColor = isDark ? colors.white : colors.B40;

  if (!currentUser || !currentOrganization) {
    return null;
  }

  const profileMenuItems = [
    <Dropdown.Item disabled key="user">
      <ProfileMenuItem currentOrganization={currentOrganization} currentUser={currentUser} />
    </Dropdown.Item>,
    ...menuItems.map(({ title, icon, path }) => (
      <Link to={path} key={`link-${title}`}>
        <Dropdown.Item key={`item-${title}`} icon={icon} component="div">
          {title}
        </Dropdown.Item>
      </Link>
    )),
    <Dropdown.Item key="logout" icon={<IconLogout color={iconColor} />} onClick={logout} data-test-id="logout-button">
      Log out
    </Dropdown.Item>,
  ];

  return (
    <Dropdown
      position="bottom-end"
      styles={{
        dropdown: { minWidth: 220, padding: '0.25rem' },
        item: { paddingInline: '0.75rem', paddingBlock: '0.625rem' },
        itemIcon: {
          marginRight: '0.75rem',
        },
      }}
      control={
        <ActionIcon variant="transparent">
          <Avatar
            size={24}
            radius="sm"
            data-test-id="header-profile-avatar"
            src={currentUser?.profilePicture || FALLBACK_AVATAR}
          />
        </ActionIcon>
      }
    >
      {profileMenuItems}
      <When truthy={IS_SELF_HOSTED}>
        <Dropdown.Item disabled>
          <Text color={colors.B40}>Version: {REACT_APP_VERSION}</Text>
        </Dropdown.Item>
      </When>
    </Dropdown>
  );
}
