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
            <div className="flex gap-2 flex-nowrap items-start self-stretch my-1 p-2 hover:bg-slate-200">
              <div className="rounded-full w-8 h-8 overflow-hidden border border-cyan-200">Avatar</div>
              <div>
                <div className="text-xl font-bold">{notification.subject || 'Subject'}</div>
                <div>{notification.body}</div>
              </div>
            </div>
          );
        }}
      />
    </>
  );
}
