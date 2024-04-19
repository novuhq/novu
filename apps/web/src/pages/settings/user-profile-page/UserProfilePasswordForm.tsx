import { Button, errorMessage, IconOutlineLockPerson, PasswordInput, successMessage } from '@novu/design-system';
import { checkIsResponseError, IResponseError } from '@novu/shared';
import { api, useAuthContext } from '@novu/shared-web';
import * as Sentry from '@sentry/react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { css } from '../../../styled-system/css';
import { Stack } from '../../../styled-system/jsx';
import { PasswordRequirementPopover } from '../../auth/components/PasswordRequirementPopover';
import { SHARED_PASSWORD_INPUT_REGISTER_OPTIONS } from './UserProfilePasswordSidebar.shared';

type UserProfilePasswordFormProps = {
  token: string;
  onSuccess?: () => void;
};

export const UserProfilePasswordForm: React.FC<UserProfilePasswordFormProps> = ({ token, onSuccess }) => {
  const { setToken } = useAuthContext();

  const { isLoading, mutateAsync, error, isError } = useMutation<
    { token: string },
    IResponseError,
    {
      password: string;
      token: string;
    }
  >((data) => api.post(`/v1/auth/reset`, data));

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid },
    setError,
  } = useForm({
    defaultValues: {
      password: '',
      passwordRepeat: '',
    },
  });

  const onSubmitPasswords = async (data: { password: string; passwordRepeat: string }) => {
    if (data.password !== data.passwordRepeat) {
      setError('passwordRepeat', { message: 'Passwords do not match' });

      return;
    }

    const itemData = {
      password: data.password,
      token,
    };

    try {
      const response = await mutateAsync(itemData);

      setToken(response.token);

      successMessage('Password was set successfully');
      onSuccess?.();
    } catch (err: unknown) {
      let errMessage = 'Error while setting password';
      if (checkIsResponseError(err)) {
        if (err.statusCode !== 400) {
          Sentry.captureException(err);
        }

        errMessage = `${errMessage}: ${err.message}`;
      }

      errorMessage(errMessage);
    }

    return true;
  };

  const isSubmitDisabled = !isValid;

  return (
    <form noValidate name="set-password-form" id="set-password-form" onSubmit={handleSubmit(onSubmitPasswords)}>
      <Stack direction={'column'} gap={'200'}>
        <PasswordRequirementPopover control={control}>
          <PasswordInput
            error={errors.password?.message}
            {...register('password', {
              ...SHARED_PASSWORD_INPUT_REGISTER_OPTIONS,
            })}
            required
            label="Password"
            placeholder="Type your new password"
            data-test-id="password"
          />
        </PasswordRequirementPopover>
        <PasswordInput
          error={errors.passwordRepeat?.message}
          {...register('passwordRepeat', {
            ...SHARED_PASSWORD_INPUT_REGISTER_OPTIONS,
          })}
          required
          label="Repeat Password"
          placeholder="Type it again"
          data-test-id="password-repeat"
        />
        <Button
          icon={<IconOutlineLockPerson color="typography.text.main" />}
          inherit
          loading={isLoading}
          submit
          disabled={isSubmitDisabled}
          data-test-id="submit-btn"
          className={css({ alignSelf: 'flex-end', width: 'fit-content !important' })}
        >
          Set Password
        </Button>
      </Stack>
      {isError && (
        <p
          data-test-id="error-alert-banner"
          className={css({
            mt: '125',
            textAlign: 'right',
            color: 'typography.text.feedback.alert',
            fontWeight: 'strong',
          })}
        >
          {' '}
          {error?.message}
        </p>
      )}
    </form>
  );
};
