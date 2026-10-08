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
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  /** Our own check of the two names, which Clerk only asks for when its app is set to. */
  const [nameErrors, setNameErrors] = useState<{ firstName?: string; lastName?: string }>({});
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

    // Both names are needed: the account behind a Human account can't be created without them.
    const missing = {
      firstName: firstName.trim() ? undefined : 'Enter your first name.',
      lastName: lastName.trim() ? undefined : 'Enter your last name.',
    };
    setNameErrors(missing);
    if (missing.firstName || missing.lastName) {
      return;
    }

    void run('submit', async () => {
      const { error } = await signUp.password({
        emailAddress: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
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
        <div className="grid grid-cols-2 items-start gap-3">
          <AuthField label="First name" error={nameErrors.firstName ?? errorText(errors.fields.firstName)}>
            {(field) => (
              <AuthInput
                {...field}
                name="given-name"
                autoComplete="given-name"
                value={firstName}
                onChange={(event) => {
                  setFirstName(event.target.value);
                  setNameErrors((current) => ({ ...current, firstName: undefined }));
                }}
                disabled={disabled}
              />
            )}
          </AuthField>
          <AuthField label="Last name" error={nameErrors.lastName ?? errorText(errors.fields.lastName)}>
            {(field) => (
              <AuthInput
                {...field}
                name="family-name"
                autoComplete="family-name"
                value={lastName}
                onChange={(event) => {
                  setLastName(event.target.value);
                  setNameErrors((current) => ({ ...current, lastName: undefined }));
                }}
                disabled={disabled}
              />
            )}
          </AuthField>
        </div>
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
        {/*
          Clerk puts its bot check here on submit. Most of the time that check is invisible: an element with
          no height, which would still get the form's gap and push the button down. So it shares the button's
          slot, and takes room (with Clerk's own margin under it) only when there is something to solve.
        */}
        <div className="flex flex-col">
          {/* biome-ignore lint/correctness/useUniqueElementIds: Clerk looks the element up by this id */}
          <div id="clerk-captcha" />
          <Button type="submit" className={AUTH_BUTTON} pending={busy === 'submit'} disabled={disabled}>
            Create account
          </Button>
        </div>
      </form>
      <SwitchForm question="Have an account?" href={authHref('/sign-in', redirectPath)}>
        Sign in
      </SwitchForm>
    </AuthCard>
  );
}
