import Title from '@/components/Title';
import { novuConfig } from '@/utils/config';
import { Inbox } from '@novu/react';

export default function Home() {
  return (
    <>
      <Title title="Default Inbox" />
      <Inbox options={novuConfig} />
    </>
  );
}
