import { Inbox } from '@novu/nextjs';
import { novuConfig } from '@/utils/config';

export default function InboxPage() {
  return (
    <>
      <h1>Hello from Inbox page</h1>
      <Inbox {...novuConfig} />
    </>
  );
}
