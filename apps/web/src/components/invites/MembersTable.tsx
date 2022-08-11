import { Avatar, Container, Divider, Group, LoadingOverlay, MenuItem as DropdownItem, Text } from '@mantine/core';
import { colors, Dropdown, Tag } from '../../design-system';
import { DotsHorizontal, Trash } from '../../design-system/icons';
import { MemberRoleEnum, MemberStatusEnum } from '@novu/shared';
import styled from 'styled-components';
import * as capitalize from 'lodash.capitalize';
import useStyles from '../../design-system/config/text.styles';

export function MembersTable({ members, currentUser, onRemoveMember, loading = false }) {
  const { classes, theme } = useStyles();

  function isEnableMemberActions(currentMember): boolean {
    const currentUserRoles = members?.find((memberEntity) => memberEntity._userId == currentUser?._id)?.roles || [];

    const isNotMyself = currentUser?._id != currentMember._userId;
    const isAllowedToRemove = currentUserRoles.includes(MemberRoleEnum.ADMIN);

    return isNotMyself && isAllowedToRemove;
  }

  return (
    <Container fluid mt={15} style={{ position: 'relative', minHeight: 500 }}>
      <LoadingOverlay
        visible={loading}
        overlayColor={theme.colorScheme === 'dark' ? colors.B30 : colors.B98}
        loaderProps={{
          color: colors.error,
        }}
      />

      {members?.map((member) => {
        return (
          <MemberRowWrapper key={member._id} data-test-id={'member-row-' + member._id}>
            <Avatar style={{ marginRight: 10, width: 40, height: 40 }} src={member.user?.profilePicture} radius="xl">
              {capitalize((member.user?.firstName || '')[0])} {capitalize((member.user?.lastName || '')[0])}
            </Avatar>
            <Group direction="column" spacing={5}>
              <Text className={classes.heading}>
                {member.user
                  ? `${capitalize((member.user?.firstName || '') as string)} ${capitalize(
                      (member.user?.lastName || '') as string
                    )}`
                  : member.invite.email}
              </Text>
              <Text className={classes.subHeading}>{member.user?.email ? member?.user.email : null}</Text>
            </Group>
            <ActionsSider>
              <div style={{ marginLeft: 10 }}>
                {/* eslint-disable-next-line no-nested-ternary */}
                {member.memberStatus === MemberStatusEnum.INVITED ? (
                  <Tag>Invite Pending</Tag>
                ) : member.roles.find((role: string) => role === 'admin') ? (
                  <Tag>Admin</Tag>
                ) : (
                  <Tag>Member</Tag>
                )}
              </div>
            </ActionsSider>
            {isEnableMemberActions(member) ? (
              <div>
                <Dropdown
                  control={
                    <div style={{ cursor: 'pointer', marginLeft: 10 }} data-test-id="actions-row-btn">
                      <DotsHorizontal />
                    </div>
                  }
                >
                  <DropdownItem
                    key="removeBtn"
                    data-test-id="remove-row-btn"
                    onClick={() => onRemoveMember(member)}
                    icon={<Trash />}
                  >
                    Remove Member
                  </DropdownItem>
                </Dropdown>
              </div>
            ) : null}

            <Divider className={classes.seperator} />
          </MemberRowWrapper>
        );
      })}
    </Container>
  );
}

const AddMemberRow = styled.div`
  margin-top: 30px;
`;

const ActionsSider = styled.div`
  margin-left: auto;
`;

const MemberRowWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`;
