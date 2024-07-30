import { novuConfig } from '@/utils/config';
import { Inbox } from '@novu/react';

export default function Home() {
  return (
    <div className="text-center flex flex-col gap-4">
      <p className="text-xl">Default Inbox</p>
      <Inbox options={novuConfig} />
    </div>
  );
}
