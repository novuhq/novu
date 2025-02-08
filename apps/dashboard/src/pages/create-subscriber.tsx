import { CreateSubscriberForm } from '@/components/subscribers/create-subscriber-form';
import { SubscriberDrawer } from '@/components/subscribers/subscriber-drawer';

export function CreateSubscriberPage() {
  return (
    <SubscriberDrawer open>
      <CreateSubscriberForm />
    </SubscriberDrawer>
  );
}
