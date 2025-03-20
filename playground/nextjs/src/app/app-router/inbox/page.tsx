import { novuConfig } from '@/utils/config';
import { Inbox, Notifications, Preferences } from '@novu/nextjs';

export default function InboxPage() {
  return (
    <>
      <h1>Hello from Inbox page</h1>
      <div className="flex flex-col gap-4">
        <h1>App Router</h1>
        <Inbox {...novuConfig}>
          <h2>My custom Inbox</h2>
          <Preferences />
          <Notifications />
        </Inbox>
        <Inbox {...novuConfig} />
      </div>
    </>
  );
}
