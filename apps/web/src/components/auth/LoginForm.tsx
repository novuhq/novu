import { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from 'react-query';
import styled from '@emotion/styled';
import { useForm } from 'react-hook-form';
import * as Sentry from '@sentry/react';
import { Divider, Button as MantineButton, Center } from '@mantine/core';
import { AuthContext } from '../../store/authContext';
import { api } from '../../api/api.client';
import { PasswordInput, Button, colors, Input, Text } from '../../design-system';
import { Github } from '../../design-system/icons';

type Props = {};

export function LoginForm({}: Props) {
  const navigate = useNavigate();
  const { setToken } = useContext(AuthContext);
  const { isLoading, mutateAsync, isError, error } = useMutation<
    { token: string },
    { error: string; message: string; statusCode: number },
    {
      email: string;
      password: string;
    }
  >((data) => api.post(`/v1/auth/login`, data));

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({});

  const onLogin = async (data) => {
    const itemData = {
      email: data.email,
      password: data.password,
    };

    try {
      const response = await mutateAsync(itemData);

      setToken((response as any).token);
      navigate('/templates');
    } catch (e: any) {
      if (e.statusCode !== 400) {
        Sentry.captureException(e);
      }
    }
  };

  return (
    <>
      <GithubButton
        my={30}
        variant="white"
        fullWidth
        radius="md"
        leftIcon={<Github />}
        sx={{ color: colors.B40, fontSize: '16px', fontWeight: '700', height: '50px' }}>
        Sign In with Github
      </GithubButton>
      <Divider label={<Text color={colors.B40}>Or</Text>} color={colors.B30} labelPosition="center" my="md" />

      <form onSubmit={handleSubmit(onLogin)}>
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
        <Link to="/auth/reset/request">
          <Text my={30} gradient align="center">
            Forgot Your Password?
          </Text>
        </Link>
        <Button mt={60} inherit loading={isLoading} submit data-test-id="submit-btn">
          Sign In
        </Button>
        <Center mt={20}>
          <Text mr={10} size="md" color={colors.B60}>
            Don't have an account yet?
          </Text>
          <Link to="/auth/signup">
            <Text gradient>Sign Up</Text>
          </Link>
        </Center>
      </form>
      {isError && (
        <Text mt={20} size="lg" weight="bold" align="center" color={colors.error}>
          {' '}
          {error?.message}
        </Text>
      )}
    </>
  );
}

const GithubButton = styled(MantineButton)`
  :hover {
    color: ${colors.B40};
  }
`;
