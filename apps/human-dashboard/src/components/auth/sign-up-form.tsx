'use client';

import { useSignUp } from '@clerk/nextjs';
import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/button';
import { CodeInput } from '@/components/ui/code-input';
import { authHref, ssoCallbackHref } from '@/lib/auth-redirect';

import {
  AUTH_BUTTON,
  AuthCard,
  AuthField,
  AuthInput,
  errorText,
  FormError,
  firstErrorText,
  OAuthButtons,
  type OAuthProvider,
  PasswordInput,
  QuietButton,
  SwitchForm,
  useBusy,
  useEnterApp,
} from './auth-form';

/** What is on screen: the form itself, then the code that proves the email address. */
type Step = 'details' | 'verify';

type Action = OAuthProvider | 'submit' | 'resend';

type SignUpFormProps = {
  /** Where to go once the account exists. */
  redirectPath: string;
  /** Something to say before the visitor has done anything, such as a failed return from GitHub or Google. */
  initialError?: string;
};

/**
 * Sign-up for a Human account (the Human Clerk app) with GitHub, Google, or email and password, built on
 * Clerk's `useSignUp` instead of its stock component. Clerk creates the user once the email is verified
 * and tells `/api/webhooks/clerk`, which sets the Human account up; nothing here does that.
 */
export function SignUpForm({ redirectPath, initialError }: SignUpFormProps) {
  const { signUp, errors } = useSignUp();
  const enterApp = useEnterApp(redirectPath);

  const [step, setStep] = useState<Step>('details');
  const [busy, setBusy] = useBusy<Action>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  /** A message of our own, for the cases Clerk reports no error for. */
  const [notice, setNotice] = useState<string | null>(initialError ?? null);

  const disabled = busy !== null;

  async function run(action: Action, request: () => Promise<void>) {
    setBusy(action);
    setNotice(null);
    try {
      await request();
    } catch {
      setNotice('Something went wrong. Check your connection and try again.');
    }
    setBusy(null);
  }

  /** Moves on from whatever Clerk says the sign-up still needs. */
  async function advance() {
    if (signUp.status === 'complete') {
      await signUp.finalize({ navigate: enterApp });

      return;
    }

    if (signUp.unverifiedFields.includes('email_address')) {
      const { error } = await signUp.verifications.sendEmailCode();
      if (!error) {
        setCode('');
        setStep('verify');
      }

      return;
    }

    setNotice('This account needs details that this page cannot ask for yet. Sign up with GitHub or Google instead.');
  }

  function continueWith(strategy: OAuthProvider) {
    setNotice(null);
    setBusy(strategy);
    signUp
      .sso({
        strategy,
        redirectCallbackUrl: ssoCallbackHref('/sign-up', redirectPath),
        redirectUrl: redirectPath,
      })
      // On success the browser is leaving, and the button stays busy until it has.
      .then(({ error }) => error && setBusy(null))
      .catch(() => {
        setBusy(null);
        setNotice('Could not reach that provider. Try again.');
      });
  }

  function submitDetails(event: FormEvent) {
    event.preventDefault();
    void run('submit', async () => {
      const { error } = await signUp.password({ emailAddress: email.trim(), password });
      if (!error) {
        await advance();
      }
    });
  }

  function verifyCode(value: string) {
    void run('submit', async () => {
      const { error } = await signUp.verifications.verifyEmailCode({ code: value });
      if (!error) {
        await advance();
      }
    });
  }

  /** Back to the form, dropping the half-done attempt and whatever Clerk said about it. */
  function startOver() {
    void signUp.reset();
    setNotice(null);
    setCode('');
    setStep('details');
  }

  const globalError = errors.global?.[0];

  if (step === 'verify') {
    return (
      <AuthCard
        step={step}
        title="Check your email"
        description={
          <>
            Enter the code we sent to <span className="text-foreground">{email.trim()}</span>.
          </>
        }
      >
        <form
          noValidate
          className="flex flex-col gap-4.5"
          onSubmit={(event) => {
            event.preventDefault();
            verifyCode(code);
          }}
        >
          <AuthField label="Verification code" error={errorText(errors.fields.code)}>
            {({ invalid }) => (
              <CodeInput
                value={code}
                onChange={setCode}
                onComplete={verifyCode}
                label="Code from the email"
                invalid={invalid}
                disabled={disabled}
                autoFocus
              />
            )}
          </AuthField>
          <FormError>
            {firstErrorText(
              notice,
              globalError,
              errors.fields.emailAddress,
              errors.fields.password,
              errors.fields.captcha
            )}
          </FormError>
          <Button
            type="submit"
            className={AUTH_BUTTON}
            pending={busy === 'submit'}
            disabled={disabled || code.length < 6}
          >
            Verify
          </Button>
        </form>
        <div className="flex items-center justify-between gap-2">
          <QuietButton onClick={startOver} disabled={disabled}>
            Use another email
          </QuietButton>
          <QuietButton
            disabled={disabled}
            onClick={() =>
              void run('resend', async () => {
                await signUp.verifications.sendEmailCode();
              })
            }
          >
            {busy === 'resend' ? 'Sending…' : 'Resend code'}
          </QuietButton>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      step={step}
      title="Create your account"
      description="One Human account for your agent, channels and contacts."
    >
      <OAuthButtons
        pending={busy === 'oauth_github' || busy === 'oauth_google' ? busy : null}
        disabled={disabled}
        onSelect={continueWith}
      />
      <form noValidate className="flex flex-col gap-4.5" onSubmit={submitDetails}>
        <AuthField label="Email" error={errorText(errors.fields.emailAddress)}>
          {(field) => (
            <AuthInput
              {...field}
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={disabled}
            />
          )}
        </AuthField>
        <AuthField label="Password" error={errorText(errors.fields.password)}>
          {(field) => (
            <PasswordInput
              {...field}
              name="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={disabled}
            />
          )}
        </AuthField>
        <FormError>{firstErrorText(notice, globalError, errors.fields.captcha, errors.fields.code)}</FormError>
        {/* Clerk puts its bot check here when it wants one. Empty otherwise. */}
        {/* biome-ignore lint/correctness/useUniqueElementIds: Clerk looks the element up by this id */}
        <div id="clerk-captcha" className="empty:hidden" />
        <Button type="submit" className={AUTH_BUTTON} pending={busy === 'submit'} disabled={disabled}>
          Create account
        </Button>
      </form>
      <SwitchForm question="Have an account?" href={authHref('/sign-in', redirectPath)}>
        Sign in
      </SwitchForm>
    </AuthCard>
  );
}
