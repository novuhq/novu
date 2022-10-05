import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from 'react-query';
import { useForm } from 'react-hook-form';
import * as Sentry from '@sentry/react';
import { showNotification } from '@mantine/notifications';
import { AuthContext } from '../../store/authContext';
import { api } from '../../api/api.client';
import { PasswordInput, Button, colors, Text } from '../../design-system';

type Props = {
  token: string;
};

export function PasswordResetForm({ token }: Props) {
  const { setToken } = useContext(AuthContext);

  const navigate = useNavigate();
  const { isLoading, mutateAsync, isError, error } = useMutation<
    { token: string },
    { error: string; message: string; statusCode: number },
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
      navigate('/templates');
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
    formState: { errors },
  } = useForm({});

  return (
    <>
      <form noValidate name="reset-form" onSubmit={handleSubmit(onForgotPassword)}>
        <PasswordInput
          error={errors.password?.message}
          mt={20}
          {...register('password', {
            required: 'Please input your password',
            minLength: { value: 8, message: 'Minimum 8 characters' },
            pattern: {
              value: /^(?=.*\d)(?=.*[a-z])(?!.*\s).{8,}$/,
              message: 'The password must contain numbers and letters',
            },
          })}
          required
          label="Password"
          placeholder="Type your new password"
          data-test-id="password"
        />
        <PasswordInput
          error={errors.passwordRepeat?.message}
          mt={20}
          {...register('passwordRepeat', {
            required: 'Please input your password',
            minLength: { value: 8, message: 'Minimum 8 characters' },
            pattern: {
              value: /^(?=.*\d)(?=.*[a-z])(?!.*\s).{8,}$/,
              message: 'The password must contain numbers and letters',
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
