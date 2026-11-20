'use client';

import { SignUp, useSignUp } from '@clerk/nextjs';
import type { ComponentProps } from 'react';

import { AuthHeading } from './auth-card';

/**
 * Clerk's sign-up form for someone claiming an agent. Clerk's text is set once for every form, so the first
 * step swaps its heading for one that says what signing up is for. Clerk moves between its steps without
 * telling the page or the router, but the first step is over once the sign-up exists.
 */
export function ClaimSignUp(props: ComponentProps<typeof SignUp>) {
  const { signUp } = useSignUp();
  const firstStep = !signUp.id;

  return (
    <>
      {firstStep && (
        <div className="mb-4.5 flex flex-col gap-4.5">
          <AuthHeading title="Sign up to claim your agent" description="Its threads and contacts come with it." />
        </div>
      )}
      <SignUp {...props} appearance={{ elements: { header: firstStep ? 'hidden' : undefined } }} />
    </>
  );
}
