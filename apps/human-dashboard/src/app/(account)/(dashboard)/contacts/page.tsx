import type { Metadata } from 'next';

import { PageHeader } from '@/components/dashboard/page-header';

export const metadata: Metadata = {
  title: 'Contacts',
};

export default function ContactsPage() {
  return <PageHeader title="Contacts" description="People your agent can ask. You're here by default." />;
}
