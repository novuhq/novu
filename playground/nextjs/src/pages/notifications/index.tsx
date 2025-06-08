import Title from '@/components/Title';
import { novuConfig } from '@/utils/config';
import { Inbox, Notifications } from '@novu/nextjs';
import { useState } from 'react';

export default function Home() {
  const [count, setCount] = useState(0);

  return (
    <>
      <Title title="Notifications Component" />
      <div className="h-[600-px] w-96 overflow-y-auto">
        <Inbox {...novuConfig}>
          <Notifications
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
                    {!notification.isRead && (
                      <div className="border-background absolute right-2 top-2 size-2 rounded-full border bg-blue-500" />
                    )}
                  </div>
                  <div>{count}</div>
                </div>
              );
            }}
          />
        </Inbox>
      </div>
      <button
        className="max-w-40 self-center rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-700"
        onClick={() => setCount((prev) => prev + 1)}
      >
        Increment {count}
      </button>
    </>
  );
}
