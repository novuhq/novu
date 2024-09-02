import Title from '@/components/Title';
import { novuConfig } from '@/utils/config';
import { Inbox } from '@novu/react';

export default function Home() {
  return (
    <>
      <Title title="Render Notification Props" />
      <Inbox
        {...novuConfig}
        renderNotification={(notification) => {
          return (
            <div
              className="relative cursor-pointer flex gap-2 flex-nowrap items-start self-stretch my-1 p-2 hover:bg-slate-200"
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
              <div className="rounded-full min-w-8 w-8 h-8 overflow-hidden border border-cyan-200">Avatar</div>
              <div>
                <div className="text-xl font-bold">{notification.subject || 'Subject'}</div>
                <div>{notification.body}</div>
                {!notification.isRead && (
                  <div className="absolute right-2 top-2 bg-blue-500 rounded-full border border-background size-2" />
                )}
              </div>
            </div>
          );
        }}
      />
    </>
  );
}
