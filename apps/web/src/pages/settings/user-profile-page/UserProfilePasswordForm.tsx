import { showNotification } from '@mantine/notifications';
import { Button, IconOutlineLockPerson, PasswordInput } from '@novu/design-system';
import { checkIsResponseError, IResponseError, passwordConstraints } from '@novu/shared';
import { api, useAuthContext } from '@novu/shared-web';
import * as Sentry from '@sentry/react';
import { useMutation } from '@tanstack/react-query';
import { FormEventHandler } from 'react';
import { RegisterOptions, useForm } from 'react-hook-form';
import { css, cx } from '../../../styled-system/css';
import { Stack } from '../../../styled-system/jsx';
import { text } from '../../../styled-system/recipes';
import { PasswordRequirementPopover } from '../../auth/components/PasswordRequirementPopover';

type UserProfilePasswordFormProps = {
  token: string;
  onSuccess?: () => void;
};

const SHARED_REGISTER_OPTIONS: RegisterOptions = {
  required: 'Please input your password',
  minLength: { value: passwordConstraints.minLength, message: `Minimum ${passwordConstraints.minLength} characters` },
  maxLength: {
    value: passwordConstraints.maxLength,
    message: `Maximum ${passwordConstraints.maxLength} characters`,
  },
  pattern: {
    value: passwordConstraints.pattern,
    message:
      `The password must contain minimum ${passwordConstraints.minLength}` +
      ` and maximum ${passwordConstraints.maxLength} characters, at least one uppercase` +
      ` letter, one lowercase letter, one number and one special character #?!@$%^&*()-`,
  },
};

export const UserProfilePasswordForm: React.FC<UserProfilePasswordFormProps> = ({ token, onSuccess }) => {
  const { setToken } = useAuthContext();

  const { isLoading, mutateAsync, isError, error } = useMutation<
    { token: string },
    IResponseError,
    {
      password: string;
      token: string;
    }
  >((data) => api.post(`/v1/auth/reset`, data));

  const onSubmitPasswords = async (data: { password: string; passwordRepeat: string }) => {
    if (data.password !== data.passwordRepeat) {
      showNotification({
        message: 'Passwords do not match',
        color: 'red',
      });

      return;
    }

    const itemData = {
      password: data.password,
      token,
    };

    try {
      const response = await mutateAsync(itemData);

      setToken(response.token);

      showNotification({
        message: 'Password was set successfully',
        color: 'green',
      });
      onSuccess?.();
    } catch (err: unknown) {
      if (checkIsResponseError(err)) {
        if (err.statusCode !== 400) {
          Sentry.captureException(err);
        }
      }
      showNotification({
        message: 'Error while setting password: ',
        color: 'red',
      });
    }

    return true;
  };

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid },
  } = useForm({
    defaultValues: {
      password: '',
      passwordRepeat: '',
    },
  });

  const isSubmitDisabled = !isValid;

  const handlePasswordSubmit: FormEventHandler = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    return handleSubmit(onSubmitPasswords)(event);
  };

  return (
    <form noValidate name="reset-form" onSubmit={handlePasswordSubmit}>
      <Stack direction={'column'} gap={'200'}>
        <PasswordRequirementPopover control={control}>
          <PasswordInput
            error={errors.password?.message}
            {...register('password', {
              ...SHARED_REGISTER_OPTIONS,
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
            ...SHARED_REGISTER_OPTIONS,
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
        {isError && (
          <p
            data-test-id="error-alert-banner"
            className={cx(text({ variant: 'strong' }), css({ mt: '125', color: 'typography.text.feedback.alert' }))}
          >
            {' '}
            {error?.message}
          </p>
        )}
      </Stack>
    </form>
  );
};
