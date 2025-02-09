import { SubscriberDrawer } from '@/components/subscribers/subscriber-drawer';
import { SubscriberTabs } from '@/components/subscribers/subscriber-tabs';
import { useParams } from 'react-router-dom';

export function EditSubscriberPage() {
  const { subscriberId } = useParams<{ subscriberId: string }>();

  if (!subscriberId) {
    return null;
  }

  return (
    <SubscriberDrawer open>
      <SubscriberTabs subscriberId={subscriberId} />
    </SubscriberDrawer>
  );
}
