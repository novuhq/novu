import { Sheet, SheetContent } from '@/components/primitives/sheet';
import { CreateSubscriberForm } from '@/components/subscribers/create-subscriber-form';
import { useOnElementUnmount } from '@/hooks/use-on-element-unmount';
import { buildRoute, ROUTES } from '@/utils/routes';
import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export function CreateSubscriberPage() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const sheetRef = useRef<HTMLDivElement>(null);
  const { environmentSlug } = useParams<{ environmentSlug: string }>();

  const navigateToSubscribersPage = () => {
    navigate(
      buildRoute(ROUTES.SUBSCRIBERS, {
        environmentSlug: environmentSlug ?? '',
      })
    );
  };

  useOnElementUnmount({
    element: sheetRef.current,
    callback: () => {
      navigateToSubscribersPage();
    },
  });

  return (
    <Sheet open={open} onOpenChange={setOpen} modal={false}>
      <SheetContent ref={sheetRef}>
        <CreateSubscriberForm onSuccess={navigateToSubscribersPage} />
      </SheetContent>
    </Sheet>
  );
}
