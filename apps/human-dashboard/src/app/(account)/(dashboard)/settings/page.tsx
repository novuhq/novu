import type { Metadata } from 'next';
import Link from 'next/link';

import { PageHeader } from '@/components/dashboard/page-header';

export const metadata: Metadata = {
  title: 'Settings',
};

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="You, your API key and your plan." />
      {/* Until the Settings page is built (NV-8965), deleting the account still lives on the old page. */}
      <p className="text-sm tracking-tight text-secondary">
        To delete your account, go to{' '}
        <Link href="/account" className="text-foreground underline underline-offset-4">
          your account page
        </Link>
        .
      </p>
    </>
  );
}
