'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import type { HumanRegion } from '@/lib/human-accounts-api';

import { type ClaimFormState, claimSetupAction } from './actions';

/** A button instead of claiming on page load, so link previews and prefetching never claim a setup. */
export function ClaimForm({ token, region }: { token: string; region: HumanRegion }) {
  const [state, formAction] = useActionState<ClaimFormState, FormData>(claimSetupAction, {});

  return (
    <form action={formAction}>
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="region" value={region} />
      <SubmitButton />
      {state.error && (
        <p
          role="alert"
          className="mt-4 rounded-md bg-accent/10 px-3 py-2 text-sm tracking-tight text-foreground ring-1 ring-accent/40"
        >
          {state.error}
        </p>
      )}
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" pending={pending}>
      Keep this setup
    </Button>
  );
}
