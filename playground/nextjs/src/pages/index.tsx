import { InboxNotification } from '@novu/js';
import { Bell, Inbox as RInbox, Settings } from '@novu/react';

export default function Home() {
  return (
    <div className="h-screen w-full bg-white">
      <RInbox
        options={{
          applicationIdentifier: process.env.NEXT_PUBLIC_NOVU_APP_ID ?? '',
          subscriberId: process.env.NEXT_PUBLIC_NOVU_SUBSCRIBER_ID ?? '',
          backendUrl: process.env.NEXT_PUBLIC_NOVU_BACKEND_URL ?? 'http://localhost:3000',
          socketUrl: process.env.NEXT_PUBLIC_NOVU_SOCKET_URL ?? 'http://localhost:3002',
        }}
        // renderNotification={(notification) => {
        //   return <button className="p-10 bg-red-300 w-full">{notification.body}</button>;
        // }}
      />

      <RInbox
        options={{
          applicationIdentifier: process.env.NEXT_PUBLIC_NOVU_APP_ID ?? '',
          subscriberId: process.env.NEXT_PUBLIC_NOVU_SUBSCRIBER_ID ?? '',
          backendUrl: process.env.NEXT_PUBLIC_NOVU_BACKEND_URL ?? 'http://localhost:3000',
          socketUrl: process.env.NEXT_PUBLIC_NOVU_SOCKET_URL ?? 'http://localhost:3002',
        }}
      >
        <Bell>
          {({ unreadCount }) => {
            return <button className="p-10 bg-red-700 w-full">{unreadCount}</button>;
          }}
        </Bell>
        <Settings />
      </RInbox>
    </div>
  );
}
