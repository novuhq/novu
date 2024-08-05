import Title from '@/components/Title';
import { novuConfig } from '@/utils/config';
import { Inbox, Preferences } from '@novu/react';

export default function Home() {
  return (
    <>
      <Title title="Preferences Component" />
      <div className="w-96 h-96 overflow-y-auto">
        <Inbox options={novuConfig}>
          <Preferences />
        </Inbox>
      </div>
    </>
  );
}
