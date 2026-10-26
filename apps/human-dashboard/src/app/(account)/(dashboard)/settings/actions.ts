'use server';

import { clerkClient, currentUser } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

import { forgetStoredBackingAccount, readHumanAccount, readStoredBackingAccount } from '@/lib/human-account';
import { deleteBackingAccount } from '@/lib/human-accounts-api';
import { regenerateApiKey } from '@/lib/human-api-key';

export type DeleteAccountResult = { ok: true } | { ok: false; error: string };

export type RegenerateApiKeyResult = { ok: true; apiKey: string } | { ok: false; error: string };

/**
 * Replaces the operator's API key and hands back the new one, for the dialog that shows it. The account
 * comes from the session only, so nobody can replace someone else's key through this action.
 */
export async function regenerateApiKeyAction(): Promise<RegenerateApiKeyResult> {
  const user = await currentUser();
  const account = user && readHumanAccount(user);
  if (!account) {
    return { ok: false, error: 'Your session has ended. Sign in again to regenerate the key.' };
  }

  try {
    const apiKey = await regenerateApiKey(account);
    revalidatePath('/settings');

    return { ok: true, apiKey };
  } catch (error) {
    console.error('Failed to regenerate the API key', error);

    return { ok: false, error: 'Something went wrong while regenerating the key. Please try again.' };
  }
}

/**
 * Deletes the operator's backing organization in Novu, then their Human account. The identity comes
 * from the session only, so nobody can delete someone else's account through this action.
 *
 * Every step can be repeated: deleting a missing backing organization is a no-op, and it's forgotten
 * before the Human account goes, so if that last step fails, trying again finishes the job.
 */
export async function deleteAccountAction(): Promise<DeleteAccountResult> {
  const user = await currentUser();
  if (!user) {
    return { ok: false, error: 'Your session has ended. Sign in again to delete your account.' };
  }

  try {
    const stored = readStoredBackingAccount(user);
    await deleteBackingAccount(stored?.region ?? 'us', user.id);

    if (stored) {
      await forgetStoredBackingAccount(user.id);
    }

    const clerk = await clerkClient();
    await clerk.users.deleteUser(user.id);
  } catch (error) {
    console.error('Failed to delete the Human account', error);

    return { ok: false, error: 'Something went wrong while deleting your account. Please try again.' };
  }

  // The browser still holds the session of the user that is gone now. It signs out itself, then leaves.
  return { ok: true };
}
