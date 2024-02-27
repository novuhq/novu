import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import * as Sentry from '@sentry/react';
import { showNotification } from '@mantine/notifications';
import { passwordConstraints } from '@novu/shared';
import type { IResponseError } from '@novu/shared';

import { useAuthContext } from '../../../components/providers/AuthProvider';
import { api } from '../../../api/api.client';
import { PasswordInput, Button, colors, Text } from '@novu/design-system';
import { PasswordRequirementPopover } from './PasswordRequirementPopover';
import { ROUTES } from '../../../constants/routes.enum';

type Props = {
  token: string;
};

export function PasswordResetForm({ token }: Props) {
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

  const onForgotPassword = async (data) => {
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
      navigate(ROUTES.WORKFLOWS);
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
    <>
      <form noValidate name="reset-form" onSubmit={handleSubmit(onForgotPassword)}>
        <PasswordRequirementPopover control={control}>
          <PasswordInput
            error={errors.password?.message}
            mt={20}
            {...register('password', {
              required: 'Please input your password',
              minLength: { value: passwordConstraints.minLength, message: 'Minimum 8 characters' },
              maxLength: {
                value: passwordConstraints.maxLength,
                message: 'Maximum 64 characters',
              },
              pattern: {
                value: passwordConstraints.pattern,
                message:
                  // eslint-disable-next-line max-len
                  'The password must contain minimum 8 and maximum 64 characters, at least one uppercase letter, one lowercase letter, one number and one special character #?!@$%^&*()-',
              },
            })}
            required
            label="Password"
            placeholder="Type your new password"
            data-test-id="password"
          />
        </PasswordRequirementPopover>
        <PasswordInput
          error={errors.passwordRepeat?.message}
          mt={20}
          {...register('passwordRepeat', {
            required: 'Please input your password',
            minLength: { value: passwordConstraints.minLength, message: 'Minimum 8 characters' },
            maxLength: {
              value: passwordConstraints.maxLength,
              message: 'Maximum 64 characters',
            },
            pattern: {
              value: passwordConstraints.pattern,
              message:
                // eslint-disable-next-line max-len
                'The password must contain minimum 8 and maximum 64 characters, at least one uppercase letter, one lowercase letter, one number and one special character #?!@$%^&*()-',
            },
          })}
          required
          label="Repeat Password"
          placeholder="Type it again"
          data-test-id="password-repeat"
        />
        <Button mt={60} inherit loading={isLoading} submit data-test-id="submit-btn">
          Reset Password
        </Button>
      </form>
      {isError && (
        <Text data-test-id="error-alert-banner" mt={20} size="lg" weight="bold" align="center" color={colors.error}>
          {' '}
          {error?.message}
        </Text>
      )}
    </>
  );
}
