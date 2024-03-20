import { showNotification } from '@mantine/notifications';
import { Button, colors, IconOutlineForwardToInbox, IconOutlineLockPerson, PasswordInput } from '@novu/design-system';
import { IResponseError, passwordConstraints } from '@novu/shared';
import { useAuthContext, api, ROUTES } from '@novu/shared-web';
import { useMutation } from '@tanstack/react-query';
import { RegisterOptions, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { cx, css } from '../../../styled-system/css';
import { Stack } from '../../../styled-system/jsx';
import { text } from '../../../styled-system/recipes';
import { PasswordRequirementPopover } from '../../auth/components/PasswordRequirementPopover';
import * as Sentry from '@sentry/react';

type UserProfilePasswordFormProps = {
  token: string;
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

export const UserProfilePasswordForm: React.FC<UserProfilePasswordFormProps> = ({ token }) => {
  const { setToken } = useAuthContext();

  const navigate = useNavigate();
  const { isLoading, mutateAsync, isError, error } = useMutation<
    { token: string },
    IResponseError,
    {
      password: string;
      token: string;
    }
  >((data) => api.post(`/v1/auth/reset`, data));

  const onSubmitPasswords = async (data) => {
    if (data.password !== data.passwordRepeat) {
      return showNotification({
        message: 'Passwords do not match',
        color: 'red',
      });
    }

    const itemData = {
      password: data.password,
      token,
    };

    try {
      const response = await mutateAsync(itemData);

      setToken(response.token);

      showNotification({
        message: 'Password was changed successfully',
        color: 'green',
      });
      // navigate(ROUTES.WORKFLOWS);
    } catch (e: any) {
      if (e.statusCode !== 400) {
        Sentry.captureException(e);
      }
    }

    return true;
  };

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: {
      password: '',
      passwordRepeat: '',
    },
  });

  return (
    <form noValidate name="reset-form" onSubmit={handleSubmit(onSubmitPasswords)}>
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
          data-test-id="submit-btn"
          className={css({ alignSelf: 'flex-end', width: 'fit-content !important' })}
        >
          Reset Password
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
