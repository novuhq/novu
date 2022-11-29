import { MenuItem as DropdownItem } from '@mantine/core';
import { MemberRoleEnum } from '@novu/shared';
import styled from 'styled-components';
import { Dropdown, Tag } from '../../design-system';

export function MemberRole({ member, onChangeMemberRole, isEnableMemberActions }) {
  const TagElement = () => {
    return <>{member.roles.find((role: string) => role === 'admin') ? <Tag>Admin</Tag> : <Tag>Member</Tag>}</>;
  };

  const availableRoles = () => {
    const roles = {
      Admin: MemberRoleEnum.ADMIN,
      Member: MemberRoleEnum.MEMBER,
    };

    return Object.entries(roles).filter((role) => !member.roles.includes(role[1]));
  };

  if (!isEnableMemberActions(member)) {
    return <TagElement />;
  }

  return (
    <>
      <Dropdown
        control={
          <ClickableTag data-test-id="change-member-role-btn">
            <TagElement />
          </ClickableTag>
        }
      >
        {availableRoles().map((role) => (
          <DropdownItem
            data-test-id={`change-member-role-to-${role[1]}-btn`}
            onClick={() => onChangeMemberRole(member, role[1])}
          >
            {role[0]}
          </DropdownItem>
        ))}
      </Dropdown>
    </>
  );
}

const ClickableTag = styled.div`
  cursor: pointer;
  span {
    cursor: pointer;
  }
`;
