import Title from '@/components/Title';
import { novuConfig } from '@/utils/config';
import { Inbox, Preferences } from '@novu/nextjs';

export default function Home() {
  return (
    <>
      <Title title="Preferences Component" />
      <div className="h-[600px] w-96 overflow-y-auto">
        <Inbox {...novuConfig}>
          <Preferences />
        </Inbox>
      </div>
    </>
  );
}
