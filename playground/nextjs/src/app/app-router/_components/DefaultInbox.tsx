'use client';

import { Inbox } from '@novu/nextjs';
import { novuConfig } from '@/utils/config';

export default function DefaultInbox() {
  return <Inbox {...novuConfig} />;
}
