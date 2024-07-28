import { Inbox } from '@/components/Inbox';

export default function Home() {
  return (
    <div className="h-screen w-full bg-white">
      <Inbox
        options={{
          applicationIdentifier: process.env.NEXT_PUBLIC_NOVU_APP_ID ?? '',
          subscriberId: process.env.NEXT_PUBLIC_NOVU_SUBSCRIBER_ID ?? '',
          backendUrl: process.env.NEXT_PUBLIC_NOVU_BACKEND_URL ?? 'http://localhost:3000',
          socketUrl: process.env.NEXT_PUBLIC_NOVU_SOCKET_URL ?? 'http://localhost:3002',
        }}
        renderNotification={(notification) => {
          return <button className="p-10 bg-red-300 w-full">{notification.body}</button>;
        }}
      />
    </div>
  );
}
