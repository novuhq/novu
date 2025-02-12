import { SubscriberDrawer } from '@/components/subscribers/subscriber-drawer';
import { useOnElementUnmount } from '@/hooks/use-on-element-unmount';
import { buildRoute, ROUTES } from '@/utils/routes';
import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export function EditSubscriberPage() {
  const { subscriberId, environmentSlug } = useParams<{ subscriberId: string; environmentSlug: string }>();
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const sheetRef = useRef<HTMLDivElement>(null);

  useOnElementUnmount({
    element: sheetRef.current,
    callback: () => {
      navigate(
        buildRoute(ROUTES.SUBSCRIBERS, {
          environmentSlug: environmentSlug ?? '',
        })
      );
    },
  });

  if (!subscriberId) {
    return null;
  }

  return <SubscriberDrawer ref={sheetRef} subscriberId={subscriberId} open={open} onOpenChange={setOpen} />;
}
