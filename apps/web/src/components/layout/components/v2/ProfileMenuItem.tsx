import { Avatar, Group } from '@mantine/core';
import { colors, Text } from '@novu/design-system';
import { IOrganizationEntity, IUserEntity } from '@novu/shared';
import { CONTEXT_PATH } from '@novu/shared-web';

const FALLBACK_AVATAR = CONTEXT_PATH + '/static/images/avatar.png';

type ProfileMenuItemProps = {
  currentUser?: IUserEntity;
  currentOrganization?: IOrganizationEntity;
};

export function ProfileMenuItem({ currentUser, currentOrganization }: ProfileMenuItemProps) {
  return (
    <Group spacing={16} noWrap>
      <Avatar radius="sm" size={40} src={currentUser?.profilePicture || FALLBACK_AVATAR} />
      <div style={{ flex: 1 }}>
        <Text data-test-id="header-dropdown-username" rows={1} weight="bold" transform="capitalize">
          {currentUser?.firstName as string} {currentUser?.lastName as string}
        </Text>
        <Text
          size={14}
          color={colors.B60}
          rows={1}
          data-test-id="header-dropdown-organization-name"
          transform="capitalize"
        >
          {currentOrganization?.name as string}
        </Text>
      </div>
    </Group>
  );
}
