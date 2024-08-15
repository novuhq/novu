import Title from '@/components/Title';
import { novuConfig } from '@/utils/config';
import { Inbox, Notifications } from '@novu/react';

export default function Home() {
  return (
    <>
      <Title title="Notifications Component" />
      <div className="w-96 h-96 overflow-y-auto">
        <Inbox {...novuConfig}>
          <Notifications />
        </Inbox>
      </div>
    </>
  );
}
