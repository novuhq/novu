import { CopilotPageEnum, PermissionsEnum } from '@novu/shared';
import { useParams } from 'react-router-dom';
import { useRegisterCopilotPageView } from '@/components/copilot-web-chat';
import { SubscriberTabs } from '@/components/subscribers/subscriber-tabs';
import { buildSubscriberPageView } from '@/components/subscribers/subscribers-copilot';
import { useFetchSubscriber } from '@/hooks/use-fetch-subscriber';
import { useHasPermission } from '@/hooks/use-has-permission';

export function EditSubscriberPage() {
  const { subscriberId } = useParams<{ subscriberId: string }>();
  const has = useHasPermission();
  const isReadOnly = !has({ permission: PermissionsEnum.SUBSCRIBER_WRITE });

  if (!subscriberId) {
    return null;
  }

  return <EditSubscriber subscriberId={subscriberId} readOnly={isReadOnly} />;
}

function EditSubscriber({ subscriberId, readOnly }: { subscriberId: string; readOnly: boolean }) {
  // The drawer's overview tab runs the same query, so this adds no request.
  const { data: subscriber, isError } = useFetchSubscriber({ subscriberId });
  useRegisterCopilotPageView(
    CopilotPageEnum.SUBSCRIBERS,
    buildSubscriberPageView(subscriberId, { subscriber, isError })
  );

  return <SubscriberTabs subscriberId={subscriberId} readOnly={readOnly} />;
}
