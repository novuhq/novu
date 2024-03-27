import { MemberRoleEnum } from '@novu/shared';
import styled from '@emotion/styled';

import { Dropdown, Tag } from '@novu/design-system';

export function MemberRole({ member, onChangeMemberRole, isEnableMemberActions, allowChangeRole = false }) {
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
          allowChangeRole ? (
            <ClickableTag data-test-id="change-member-role-btn">
              <TagElement />
            </ClickableTag>
          ) : (
            <TagElement />
          )
        }
      >
        {availableRoles().map((role, index: number) => (
          <Dropdown.Item
            key={index}
            data-test-id={`change-member-role-to-${role[1]}-btn`}
            onClick={() => onChangeMemberRole(member, role[1])}
          >
            {role[0]}
          </Dropdown.Item>
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
