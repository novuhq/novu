import { useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import * as Sentry from '@sentry/react';
import { Center } from '@mantine/core';
import { PasswordInput, Button, colors, Input, Text } from '@novu/design-system';
import { useAuth } from '@novu/shared-web';
import type { IResponseError } from '@novu/shared';
import { useVercelIntegration, useVercelParams } from '../../../hooks';
import { useSegment } from '../../../components/providers/SegmentProvider';
import { api } from '../../../api/api.client';
import { useAcceptInvite } from './useAcceptInvite';
import { ROUTES } from '../../../constants/routes.enum';
import { OAuth } from './OAuth';
import { parseServerErrorMessage } from '../../../utils/errors';

type LoginFormProps = {
  invitationToken?: string;
  email?: string;
};

export interface LocationState {
  redirectTo: {
    pathname: string;
  };
}

export function LoginForm({ email, invitationToken }: LoginFormProps) {
  const segment = useSegment();
  const { login, currentUser } = useAuth();
  const { startVercelSetup } = useVercelIntegration();
  const { isFromVercel, params: vercelParams } = useVercelParams();
  const [params] = useSearchParams();
  const tokenInQuery = params.get('token');
  const source = params.get('source');
  const sourceWidget = params.get('source_widget');
  const { isLoading: isLoadingAcceptInvite, acceptInvite } = useAcceptInvite();
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading, mutateAsync, isError, error } = useMutation<
    { token: string },
    IResponseError,
    {
      email: string;
      password: string;
    }
  >((data) => api.post('/v1/auth/login', data));

  useEffect(() => {
    if (tokenInQuery) {
      debugger;
      login(tokenInQuery);
    }

    if (isFromVercel) {
      startVercelSetup();

      return;
    }

    if (tokenInQuery && source === 'cli') {
      segment.track('Dashboard Visit', {
        widget: sourceWidget || 'unknown',
        source: 'cli',
      });
      navigate(ROUTES.GET_STARTED);
    }

    navigate(ROUTES.GET_STARTED);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const signupLink = isFromVercel ? `${ROUTES.AUTH_SIGNUP}?${params.toString()}` : ROUTES.AUTH_SIGNUP;
  const resetPasswordLink = isFromVercel
    ? `${ROUTES.AUTH_RESET_REQUEST}?${params.toString()}`
    : ROUTES.AUTH_RESET_REQUEST;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: email || '',
      password: '',
    },
  });

  const onLogin = async (data) => {
    const itemData = {
      email: data.email,
      password: data.password,
    };

    try {
      const response = await mutateAsync(itemData);
      const token = (response as any).token;
      login(token);

      if (invitationToken) {
        const updatedToken = await acceptInvite(invitationToken);
        if (updatedToken) {
          login(updatedToken);
        }
      }

      navigate(ROUTES.WORKFLOWS);
    } catch (e: any) {
      if (e.statusCode !== 400) {
        Sentry.captureException(e);
      }
    }
  };

  const emailClientError = errors.email?.message;
  let emailServerError = parseServerErrorMessage(error);

  // TODO: Use a more human-friendly message in the IsEmail validator and remove this patch
  if (emailServerError === 'email must be an email') {
    emailServerError = 'Please provide a valid email address';
  }

  return (
    <>
      <OAuth />
      <form noValidate onSubmit={handleSubmit(onLogin)}>
        <Input
          error={emailClientError || emailServerError}
          {...register('email', {
            required: 'Please provide an email address',
            pattern: { value: /^\S+@\S+\.\S+$/, message: 'Please provide a valid email address' },
          })}
          required
          label="Email"
          type="email"
          placeholder="Type your email address..."
          disabled={!!invitationToken}
          data-test-id="email"
          mt={5}
        />
        <PasswordInput
          error={errors.password?.message}
          mt={20}
          {...register('password', {
            required: 'Please input a password',
          })}
          required
          label="Password"
          placeholder="Type your password..."
          data-test-id="password"
        />

        <Link to={resetPasswordLink}>
          <Text my={30} gradient align="center">
            Forgot Your Password?
          </Text>
        </Link>

        <Button
          submit
          mt={60}
          inherit
          loading={isLoading || isLoadingAcceptInvite}
          disabled={isLoadingAcceptInvite}
          data-test-id="submit-btn"
        >
          {invitationToken ? 'Sign In & Accept' : 'Sign In'}
        </Button>
        <Center mt={20}>
          <Text mr={10} size="md" color={colors.B60}>
            Don't have an account yet?
          </Text>
          <Link to={signupLink}>
            <Text gradient>Sign Up</Text>
          </Link>
        </Center>
      </form>
    </>
  );
}
