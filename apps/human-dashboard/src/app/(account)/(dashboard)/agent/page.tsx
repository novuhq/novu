import type { Metadata } from 'next';

import { PageHeader } from '@/components/dashboard/page-header';

export const metadata: Metadata = {
  title: 'Agent',
};

export default function AgentPage() {
  return <PageHeader title="Agent" description="Your agent and how people see it." />;
}
