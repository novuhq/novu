'use client';

import { useClerk } from '@clerk/nextjs';
import { useState } from 'react';

import { Button, SMALL_BUTTON } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';

/** Ends the session and leaves the dashboard, like "Sign out" in the account menu. */
export function LogOutButton() {
  const { signOut } = useClerk();
  const [pending, setPending] = useState(false);

  async function logOut() {
    setPending(true);

    try {
      await signOut({ redirectUrl: '/' });
    } catch (error) {
      console.error('Failed to log out', error);
      toast("Couldn't log you out. Please try again.", 'error');
      setPending(false);
    }
  }

  return (
    <Button variant="secondary" className={SMALL_BUTTON} pending={pending} onClick={logOut}>
      Log out
    </Button>
  );
}
