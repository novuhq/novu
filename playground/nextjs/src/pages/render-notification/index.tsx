import Title from '@/components/Title';
import { novuConfig } from '@/utils/config';
import { Inbox } from '@novu/nextjs';

declare global {
  interface NotificationData {
    foo: string;
  }
}

export default function Home() {
  return (
    <>
      <Title title="Render Notification Props" />
      <Inbox
        {...novuConfig}
        renderNotification={(notification) => {
          return (
            <div
              className="relative my-1 flex cursor-pointer flex-nowrap items-start gap-2 self-stretch p-2 hover:bg-slate-200"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();

                if (!notification.isRead) {
                  notification.read();
                } else {
                  notification.unread();
                }
              }}
            >
              <div className="h-8 w-8 min-w-8 overflow-hidden rounded-full border border-cyan-200">Avatar</div>
              <div>
                <div className="text-xl font-bold">{notification.subject || 'Subject'}</div>
                <div>{notification.body}</div>
                {notification.data?.foo && <div>{notification.data.foo}</div>}
                {!notification.isRead && (
                  <div className="border-background absolute right-2 top-2 size-2 rounded-full border bg-blue-500" />
                )}
              </div>
            </div>
          );
        }}
      />
    </>
  );
}
