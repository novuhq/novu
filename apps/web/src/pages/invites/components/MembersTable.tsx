import { Avatar, Divider, Container, LoadingOverlay, Stack, Text } from '@mantine/core';
import styled from '@emotion/styled';
import * as capitalize from 'lodash.capitalize';
import { useClipboard } from '@mantine/hooks';
import { MemberRoleEnum, MemberStatusEnum } from '@novu/shared';

import { DotsHorizontal, Mail, Trash, useTextStyles, colors, Dropdown, Tag } from '@novu/design-system';
import { MemberRole } from './MemberRole';
import { When } from '../../../components/utils/When';
import { parseUrl } from '../../../utils/routeUtils';
import { ROUTES } from '../../../constants/routes.enum';

export function MembersTable({
  members,
  currentUser,
  onRemoveMember,
  loading = false,
  onResendInviteMember,
  onChangeMemberRole,
  allowChangeRole = false,
}) {
  const { classes, theme } = useTextStyles();
  const clipboardInviteLink = useClipboard({ timeout: 1000 });
  const selfHosted = process.env.REACT_APP_DOCKER_HOSTED_ENV === 'true';

  function isEnableMemberActions(currentMember): boolean {
    const currentUserRoles = members?.find((memberEntity) => memberEntity._userId === currentUser?._id)?.roles || [];

    const isNotMyself = currentUser?._id !== currentMember._userId;
    const isAllowedToRemove = currentUserRoles.includes(MemberRoleEnum.ADMIN);

    return isNotMyself && isAllowedToRemove;
  }

  function memberInvited(currentMember): boolean {
    return currentMember?.memberStatus === MemberStatusEnum.INVITED;
  }

  function onCopyInviteLinkClick(currentMemberToken: any): void {
    const inviteLink =
      `${window.location.origin.toString()}` + parseUrl(ROUTES.AUTH_INVITATION_TOKEN, { token: currentMemberToken });
    clipboardInviteLink.copy(inviteLink);
  }

  return (
    <Container fluid mt={15} style={{ position: 'relative', minHeight: 500 }} px={0}>
      <LoadingOverlay
        visible={loading}
        overlayColor={theme.colorScheme === 'dark' ? colors.B30 : colors.B98}
        loaderProps={{
          color: colors.error,
        }}
      />

      {members?.map((member, index: number) => {
        return (
          <MemberRowWrapper key={member._id} data-test-id={'member-row-' + member._id}>
            <Avatar style={{ marginRight: 10, width: 40, height: 40 }} src={member.user?.profilePicture} radius="xl">
              {capitalize((member.user?.firstName || '')[0])} {capitalize((member.user?.lastName || '')[0])}
            </Avatar>
            <Stack spacing={5}>
              <Text className={classes.heading}>
                {member.user
                  ? `${capitalize((member.user?.firstName || '') as string)} ${capitalize(
                      (member.user?.lastName || '') as string
                    )}`
                  : member.invite.email}
              </Text>
              {member.user?.email ? <Text className={classes.subHeading}>{member.user?.email}</Text> : null}
            </Stack>
            <ActionsSider>
              <div style={{ marginLeft: 10 }}>
                {member.memberStatus === MemberStatusEnum.INVITED ? <Tag mr={10}>Invite Pending</Tag> : null}
                <MemberRole
                  key={index}
                  onChangeMemberRole={onChangeMemberRole}
                  member={member}
                  isEnableMemberActions={isEnableMemberActions}
                  allowChangeRole={allowChangeRole}
                />
              </div>
            </ActionsSider>
            <When truthy={isEnableMemberActions(member)}>
              <div>
                <Dropdown
                  control={
                    <div style={{ cursor: 'pointer', marginLeft: 10 }} data-test-id="actions-row-btn">
                      <DotsHorizontal />
                    </div>
                  }
                  position="left"
                  middlewares={{ flip: false, shift: false }}
                >
                  <Dropdown.Item
                    key="removeBtn"
                    data-test-id="remove-row-btn"
                    onClick={() => onRemoveMember(member)}
                    icon={<Trash />}
                  >
                    Remove Member
                  </Dropdown.Item>
                  <When truthy={memberInvited(member)}>
                    <Dropdown.Item
                      key="copyInviteBtn"
                      data-test-id="copy-invite-btn"
                      onClick={() => onCopyInviteLinkClick(member.invite.token)}
                      icon={<Mail />}
                    >
                      Copy Invite Link
                    </Dropdown.Item>

                    <When truthy={!selfHosted}>
                      <Dropdown.Item
                        key="resendInviteBtn"
                        data-test-id="resend-invite-btn"
                        onClick={() => onResendInviteMember(member)}
                        icon={<Mail />}
                      >
                        Resend Invite
                      </Dropdown.Item>
                    </When>
                  </When>
                </Dropdown>
              </div>
            </When>
            <Divider className={classes.separator} />
          </MemberRowWrapper>
        );
      })}
    </Container>
  );
}
const ActionsSider = styled.div`
  margin-left: auto;
`;

const MemberRowWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`;
