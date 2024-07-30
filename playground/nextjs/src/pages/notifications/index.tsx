import { novuConfig } from '@/utils/config';
import { Inbox, Notifications } from '@novu/react';

export default function Home() {
  return (
    <div className="text-center flex flex-col gap-4">
      <p className="text-xl">Notifications Component</p>
      <div className="w-96 h-96 overflow-y-auto">
        <Inbox options={novuConfig}>
          <Notifications />
        </Inbox>
      </div>
    </div>
  );
}
