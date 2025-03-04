import { SubscriberDrawer } from '@/components/subscribers/subscriber-drawer';
import { useEnvironment } from '@/context/environment/hooks';
import { useOnElementUnmount } from '@/hooks/use-on-element-unmount';
import { buildRoute, ROUTES } from '@/utils/routes';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export function EditSubscriberPage() {
  const { subscriberId } = useParams<{ subscriberId: string }>();
  const navigate = useNavigate();
  const { currentEnvironment } = useEnvironment();
  const [open, setOpen] = useState(true);

  const { ref: unmountRef } = useOnElementUnmount({
    callback: () => {
      navigate(buildRoute(ROUTES.SUBSCRIBERS, { environmentSlug: currentEnvironment?.slug ?? '' }));
    },
    condition: !open,
  });

  if (!subscriberId) {
    return null;
  }

  return <SubscriberDrawer ref={unmountRef} subscriberId={subscriberId} open={open} onOpenChange={setOpen} />;
}
