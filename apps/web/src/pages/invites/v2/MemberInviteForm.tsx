import { Group } from '@mantine/core';
import { Button, errorMessage, Invite, successMessage } from '@novu/design-system';
import { IResponseError } from '@novu/shared';
import { useMutation } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { IS_SELF_HOSTED } from '../../../config';

import { inviteMember } from '../../../api/organization';

import { StyledInput } from './MembersInvitePage.styles';

interface IInviteMemberForm {
  email: string;
}

const INITIAL_VALUES: IInviteMemberForm = {
  email: '',
};

export function MemberInviteForm({
  onSuccess,
  inviteByLink,
}: {
  onSuccess: () => void;
  inviteByLink: (email: string) => void;
}) {
  const { control, handleSubmit, reset } = useForm<IInviteMemberForm>({
    defaultValues: INITIAL_VALUES,
  });

  const { isLoading: loadingSendInvite, mutateAsync: sendInvite } = useMutation<string, IResponseError, string>(
    (email) => inviteMember(email)
  );

  async function onSubmit(data: IInviteMemberForm) {
    const { email } = data;
    if (!email) return;

    if (IS_SELF_HOSTED) {
      inviteByLink(email);
    }

    try {
      await sendInvite(email);
      onSuccess();
      if (!IS_SELF_HOSTED) {
        successMessage(`Invite sent to ${email}`);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message === 'Already invited') {
          errorMessage(`User with email: ${email} is already invited`);
        } else {
          errorMessage(err.message);
        }
      }
    }

    reset(INITIAL_VALUES);
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)}>
      <Group align="center" spacing={10}>
        <Controller
          name="email"
          control={control}
          defaultValue=""
          rules={{ required: true }}
          render={({ field }) => <StyledInput {...field} placeholder="Invite user by email" />}
        />
        <Button submit icon={<Invite />} loading={loadingSendInvite} data-test-id="submit-btn">
          Invite
        </Button>
      </Group>
    </form>
  );
}
