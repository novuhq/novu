import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Center } from '@mantine/core';
import { passwordConstraints, UTM_CAMPAIGN_QUERY_PARAM } from '@novu/shared';
import type { IResponseError } from '@novu/shared';
import { PasswordInput, Button, colors, Input, Text, Checkbox } from '@novu/design-system';

import { useAuth } from '../../../hooks/useAuth';
import { api } from '../../../api/api.client';
import { useRedirectURL, useVercelParams } from '../../../hooks';
import { useAcceptInvite } from './useAcceptInvite';
import { PasswordRequirementPopover } from './PasswordRequirementPopover';
import { ROUTES } from '../../../constants/routes';
import { OAuth } from './OAuth';
import { useSegment } from '../../../components/providers/SegmentProvider';
import { useStudioState } from '../../../studio/hooks';
import { navigateToAuthApplication } from '../../../utils';

type SignUpFormProps = {
  invitationToken?: string;
  email?: string;
};

export type SignUpFormInputType = {
  email: string;
  password: string;
  fullName: string;
};

export function SignUpForm({ invitationToken, email }: SignUpFormProps) {
  const navigate = useNavigate();
  const { setRedirectURL } = useRedirectURL();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setRedirectURL(), []);
  const location = useLocation();

  const { login } = useAuth();
  const { isLoading: isAcceptInviteLoading, acceptInvite } = useAcceptInvite();
  const { params, isFromVercel } = useVercelParams();
  const loginLink = isFromVercel ? `${ROUTES.AUTH_LOGIN}?${params.toString()}` : ROUTES.AUTH_LOGIN;
  const segment = useSegment();
  const state = useStudioState();

  const { isLoading, mutateAsync, isError, error } = useMutation<
    { token: string },
    IResponseError,
    {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      invitationToken?: string;
    }
  >((data) => api.post('/v1/auth/register', data));

  const onSubmit = async (data) => {
    const parsedSearchParams = new URLSearchParams(location.search);
    const origin = parsedSearchParams.get('origin');
    const anonymousId = parsedSearchParams.get('anonymous_id');

    // eslint-disable-next-line no-unsafe-optional-chaining
    const [firstName, lastName] = data?.fullName.trim().split(' ');
    const itemData = {
      firstName,
      lastName,
      email: data.email,
      password: data.password,
      origin,
      invitationToken,
    };

    const response = await mutateAsync(itemData);
    const { token } = response as any;
    await login(token);

    if (state?.anonymousId && anonymousId) {
      segment.alias(anonymousId, (response as any).user?.id);
    }

    if (invitationToken) {
      const updatedToken = await acceptInvite(invitationToken);
      if (updatedToken) {
        await login(updatedToken);
      }
      navigateToAuthApplication();
    } else {
      const navigateParams = isFromVercel ? `?${params.toString()}` : '';
      navigateToAuthApplication(navigateParams);
    }
  };

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SignUpFormInputType>({
    defaultValues: {
      email,
      fullName: '',
      password: '',
    },
  });

  const [accepted, setAccepted] = useState<boolean>(false);

  const serverErrorString = useMemo<string>(() => {
    return Array.isArray(error?.message) ? error?.message[0] : error?.message;
  }, [error]);

  const emailServerError = useMemo<string>(() => {
    if (serverErrorString === 'User already exists') return 'An account with this email already exists';
    if (serverErrorString === 'email must be an email') return 'Please provide a valid email';

    return '';
  }, [serverErrorString]);

  const accountCreationError = useMemo<string>(() => {
    if (serverErrorString === 'Account creation is disabled')
      return 'The creation of new accounts is currently disabled. Please contact your administrator.';

    return '';
  }, [serverErrorString]);

  return (
    <>
      <OAuth invitationToken={invitationToken} />
      <form noValidate name="login-form" onSubmit={handleSubmit(onSubmit)}>
        <Input
          error={errors.fullName?.message}
          {...register('fullName', {
            required: 'Please input full name',
          })}
          required
          data-test-id="fullName"
          label="Full Name"
          placeholder="Your full name goes here"
          mt={5}
        />
        <Input
          error={errors.email?.message || emailServerError}
          disabled={!!email}
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

        <PasswordRequirementPopover control={control}>
          <PasswordInput
            error={errors.password?.message}
            mt={20}
            {...register('password', {
              required: 'Password, not your birthdate',
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
            placeholder="Type your password..."
            data-test-id="password"
          />
        </PasswordRequirementPopover>
        <Checkbox
          onChange={() => setAccepted(!accepted)}
          required
          label={<Accept />}
          data-test-id="accept-cb"
          mt={20}
          mb={20}
        />

        {accountCreationError && (
          <Text mt={20} size="lg" align="center" color={colors.error}>
            {accountCreationError}
          </Text>
        )}

        <Button
          disabled={!accepted}
          mt={20}
          inherit
          loading={isLoading || isAcceptInviteLoading}
          submit
          data-test-id="submitButton"
        >
          Sign Up {invitationToken ? '& Accept Invite' : null}
        </Button>
        <Center mt={20}>
          <Text mr={10} size="md" color={colors.B60}>
            Already have an account?
          </Text>
          <Link to={loginLink}>
            <Text gradient> Sign In</Text>
          </Link>
        </Center>
      </form>
      {isError && !emailServerError && !accountCreationError && (
        <Text mt={20} size="lg" weight="bold" align="center" color={colors.error}>
          {' '}
          {error?.message}
        </Text>
      )}
    </>
  );
}

function Accept() {
  return (
    <>
      <span>I accept the </span>
      <a
        style={{ textDecoration: 'underline' }}
        href={`https://novu.co/terms${UTM_CAMPAIGN_QUERY_PARAM}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Terms and Conditions
      </a>
      <span> and have read the </span>
      <a
        style={{ textDecoration: 'underline' }}
        href={`https://novu.co/privacy${UTM_CAMPAIGN_QUERY_PARAM}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Privacy Policy
      </a>
    </>
  );
}
