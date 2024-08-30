import { useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { captureException } from '@sentry/react';
import { Center } from '@mantine/core';
import { PasswordInput, Button, colors, Input, Text } from '@novu/design-system';
import type { IResponseError } from '@novu/shared';
import { useAuth, useRedirectURL, useVercelIntegration, useVercelParams } from '../../../hooks';
import { useSegment } from '../../../components/providers/SegmentProvider';
import { api } from '../../../api/api.client';
import { useAcceptInvite } from './useAcceptInvite';
import { ROUTES } from '../../../constants/routes';
import { OAuth } from './OAuth';
import { parseServerErrorMessage } from '../../../utils/errors';

type LoginFormProps = {
  invitationToken?: string;
  email?: string;
};

export interface LocationState {
  redirectTo?: {
    pathname?: string;
  };
}

export function LoginForm({ email, invitationToken }: LoginFormProps) {
  const segment = useSegment();

  const { setRedirectURL } = useRedirectURL();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setRedirectURL(), []);

  const { login, currentUser, currentOrganization } = useAuth();
  const { startVercelSetup } = useVercelIntegration();
  const { isFromVercel, params: vercelParams } = useVercelParams();
  const [params] = useSearchParams();
  const tokenInQuery = params.get('token');
  const source = params.get('source');
  const sourceWidget = params.get('source_widget');
  // TODO: Deprecate the legacy cameCased format in search param
  const invitationTokenFromGithub = params.get('invitationToken') || params.get('invitation_token') || '';
  const isRedirectedFromLoginPage = params.get('isLoginPage') || params.get('is_login_page') || '';

  const { isLoading: isLoadingAcceptInvite, acceptInvite } = useAcceptInvite();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  const { isLoading, mutateAsync, isError, error } = useMutation<
    { token: string },
    IResponseError,
    {
      email: string;
      password: string;
    }
  >((data) => api.post('/v1/auth/login', data));

  const handleLoginInUseEffect = async () => {
    // if currentUser is true, it means user exists, then while accepting invitation, InvitationPage will handle accept this case
    if (currentUser) {
      handleVercelFlow();

      return;
    }

    // if token from OAuth or CLI is not present
    if (!tokenInQuery) {
      return;
    }

    // handle github login after invitation
    if (invitationTokenFromGithub) {
      await login(tokenInQuery);
      const updatedToken = await acceptInvite(invitationTokenFromGithub);

      if (updatedToken) {
        await login(updatedToken, isRedirectedFromLoginPage === 'true' ? ROUTES.WORKFLOWS : ROUTES.AUTH_APPLICATION);

        return;
      }
    }

    if (currentOrganization) {
      navigate(ROUTES.WORKFLOWS);
    } else {
      await login(tokenInQuery, ROUTES.AUTH_APPLICATION);
    }

    await handleVercelFlow();

    if (source === 'cli') {
      segment.track('Dashboard Visit', {
        widget: sourceWidget || 'unknown',
        source: 'cli',
      });
      await login(tokenInQuery, ROUTES.GET_STARTED);

      return;
    }

    await login(tokenInQuery, ROUTES.WORKFLOWS);
  };

  async function handleVercelFlow() {
    if (isFromVercel) {
      if (tokenInQuery) {
        await login(tokenInQuery);
      }

      startVercelSetup();
    }
  }

  useEffect(() => {
    handleLoginInUseEffect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [login, currentUser]);

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
      const { token } = response as any;
      await login(token);

      if (isFromVercel) {
        startVercelSetup();

        return;
      }

      if (invitationToken) {
        const updatedToken = await acceptInvite(invitationToken);
        if (updatedToken) {
          await login(updatedToken);
        }
      }

      navigate(state?.redirectTo?.pathname || ROUTES.WORKFLOWS);
    } catch (e: any) {
      if (e.statusCode !== 400) {
        captureException(e);
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
      <OAuth invitationToken={invitationToken} isLoginPage={true} />
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
