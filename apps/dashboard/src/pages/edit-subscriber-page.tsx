import { PermissionsEnum } from '@novu/shared';
import { useParams } from 'react-router-dom';
import { SubscriberTabs } from '@/components/subscribers/subscriber-tabs';
import { useHasPermission } from '@/hooks/use-has-permission';

export function EditSubscriberPage() {
  const { subscriberId } = useParams<{ subscriberId: string }>();
  const has = useHasPermission();
  const isReadOnly = !has({ permission: PermissionsEnum.SUBSCRIBER_WRITE });

  if (!subscriberId) {
    return null;
  }

  return <SubscriberTabs subscriberId={subscriberId} readOnly={isReadOnly} />;
}
