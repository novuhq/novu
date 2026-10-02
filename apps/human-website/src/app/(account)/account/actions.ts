'use server';

import { clerkClient, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { readStoredBackingAccount } from '@/lib/human-account';
import { deleteBackingAccount } from '@/lib/human-accounts-api';

/**
 * Deletes the operator's backing organization in Novu, then their Human account. The identity comes
 * from the session only, so nobody can delete someone else's account through this action.
 */
export async function deleteAccountAction(): Promise<{ error: string }> {
  const user = await currentUser();
  if (!user) {
    return { error: 'Your session has ended. Sign in again to delete your account.' };
  }

  try {
    await deleteBackingAccount(readStoredBackingAccount(user)?.region ?? 'us', user.id);

    const clerk = await clerkClient();
    await clerk.users.deleteUser(user.id);
  } catch (error) {
    console.error('Failed to delete the Human account', error);

    return { error: 'Something went wrong while deleting your account. Please try again.' };
  }

  redirect('/');
}
