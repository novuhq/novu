import { useMutation } from '@tanstack/react-query';
import * as Sentry from '@sentry/react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Center } from '@mantine/core';
import { Button, colors, Input, Text } from '@novu/design-system';
import type { IResponseError } from '@novu/shared';

import { api } from '../../../api/api.client';
import { useVercelParams } from '../../../hooks';
import { ROUTES } from '../../../constants/routes.enum';

type Props = {
  onSent: () => void;
};

export function PasswordResetRequestForm({ onSent }: Props) {
  const { isLoading, mutateAsync, isError, error } = useMutation<
    { success: boolean },
    IResponseError,
    {
      email: string;
    }
  >((data) => api.post(`/v1/auth/reset/request`, data));

  const { isFromVercel, code, next, configurationId } = useVercelParams();

  const vercelQueryParams = `code=${code}&next=${next}&configurationId=${configurationId}`;
  const loginLink = isFromVercel ? `/auth/login?${vercelQueryParams}` : ROUTES.AUTH_LOGIN;

  const onForgotPassword = async (data) => {
    const itemData = {
      email: data.email,
    };

    try {
      const response = await mutateAsync(itemData);

      onSent();
    } catch (e: any) {
      if (e.statusCode !== 400) {
        Sentry.captureException(e);
      }
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({});

  return (
    <>
      <form noValidate name="reset-form" onSubmit={handleSubmit(onForgotPassword)}>
        <Input
          error={errors.email?.message}
          {...register('email', {
            required: 'Please provide an email',
            pattern: { value: /^\S+@\S+\.\S+$/, message: 'Please provide a valid email' },
          })}
          required
          label="Email"
          placeholder="Type your email..."
          data-test-id="email"
          mt={20}
        />
        <Button mt={60} inherit loading={isLoading} submit data-test-id="submit-btn">
          Reset Password
        </Button>
        <Center mt={20}>
          <Text mr={10} size="md" color={colors.B60}>
            Know your password?
          </Text>
          <Link to={loginLink}>
            <Text gradient>Sign In</Text>
          </Link>
        </Center>
      </form>
      {isError && error?.message && (
        <Text mt={20} size="lg" weight="bold" align="center" color={colors.error}>
          {error.message}
        </Text>
      )}
    </>
  );
}
