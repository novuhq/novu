import { CopilotPageEnum, PermissionsEnum } from '@novu/shared';
import { useParams } from 'react-router-dom';
import { useRegisterCopilotPageView } from '@/components/copilot-web-chat';
import { SubscriberTabs } from '@/components/subscribers/subscriber-tabs';
import { buildSubscriberViewing, SUBSCRIBER_REACHABILITY_QUESTION } from '@/components/subscribers/subscribers-copilot';
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
  const { data: subscriber } = useFetchSubscriber({ subscriberId });
  useRegisterCopilotPageView(CopilotPageEnum.SUBSCRIBERS, {
    viewing: buildSubscriberViewing(subscriberId, subscriber),
    question: SUBSCRIBER_REACHABILITY_QUESTION,
  });

  return <SubscriberTabs subscriberId={subscriberId} readOnly={readOnly} />;
}
