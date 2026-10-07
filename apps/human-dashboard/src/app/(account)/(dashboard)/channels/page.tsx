import type { Metadata } from 'next';

import { PageHeader } from '@/components/dashboard/page-header';

export const metadata: Metadata = {
  title: 'Channels',
};

export default function ChannelsPage() {
  return (
    <PageHeader
      title="Channels"
      description="How your agent shows up on each channel. People reply right where the message lands."
    />
  );
}
