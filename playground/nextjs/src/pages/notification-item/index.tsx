import { Inbox, NotificationItem } from '@novu/nextjs';
import { useState } from 'react';
import Title from '@/components/Title';
import { novuConfig } from '@/utils/config';

type Mode = 'default' | 'swapped-body' | 'rearranged';

/** Keeps its own state so you can see it survive `notification.read()`, websocket updates and re-renders. */
const Counter = ({ label }: { label: string }) => {
  const [count, setCount] = useState(0);

  return (
    <button
      type="button"
      className="rounded border border-cyan-300 px-2 text-xs"
      onClick={(e) => {
        e.stopPropagation();
        setCount((c) => c + 1);
      }}
    >
      {label}: {count}
    </button>
  );
};

export default function Home() {
  const [mode, setMode] = useState<Mode>('default');
  const [renders, setRenders] = useState(0);
  const [keepOpen, setKeepOpen] = useState(false);

  return (
    <>
      <Title title="Notification Item" />
      <div className="flex gap-2">
        {(['default', 'swapped-body', 'rearranged'] as Mode[]).map((value) => (
          <button
            key={value}
            type="button"
            className={`rounded px-3 py-1 text-white ${mode === value ? 'bg-blue-700' : 'bg-blue-400'}`}
            onClick={() => setMode(value)}
          >
            {value}
          </button>
        ))}
        <button
          type="button"
          className="rounded bg-slate-500 px-3 py-1 text-white"
          onClick={() => setRenders((r) => r + 1)}
        >
          Re-render host ({renders})
        </button>
        <label className="flex items-center gap-1 text-sm">
          <input type="checkbox" checked={keepOpen} onChange={(e) => setKeepOpen(e.target.checked)} />
          Keep inbox open
        </label>
      </div>
      <Inbox
        {...novuConfig}
        open={keepOpen ? true : undefined}
        onNotificationClick={(notification) => console.log('clicked', notification.id)}
        renderNotification={(notification) => {
          if (mode === 'swapped-body') {
            return (
              <NotificationItem
                notification={notification}
                renderBody={(n) => (
                  <div className="flex items-center gap-2">
                    <span>{n.body}</span>
                    <Counter label="body" />
                  </div>
                )}
              />
            );
          }

          if (mode === 'rearranged') {
            return (
              <NotificationItem notification={notification}>
                <NotificationItem.Content>
                  <NotificationItem.Date />
                  <NotificationItem.Text>
                    <NotificationItem.Subject />
                    <NotificationItem.Body />
                  </NotificationItem.Text>
                  <Counter label={`renders ${renders}`} />
                  <NotificationItem.CustomActions />
                </NotificationItem.Content>
                <NotificationItem.DefaultActions />
                <NotificationItem.Avatar />
                <NotificationItem.Dot />
              </NotificationItem>
            );
          }

          return <NotificationItem notification={notification} />;
        }}
      />
    </>
  );
}
