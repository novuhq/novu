import { FormProtection } from '@/components/form-protection';
import { Sheet, SheetContent } from '@/components/primitives/sheet';
import { CreateSubscriberForm } from '@/components/subscribers/create-subscriber-form';
import { useFormProtection } from '@/hooks/use-form-protection';
import { useOnElementUnmount } from '@/hooks/use-on-element-unmount';
import { buildRoute, ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';
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

  const { isFormDirty, setShowAlert, showAlert } = useFormProtection(sheetRef);

  useOnElementUnmount({
    element: sheetRef.current,
    callback: () => {
      navigateToSubscribersPage();
    },
  });

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(open) => {
          if (isFormDirty) {
            return setShowAlert(true);
          }
          setOpen(open);
        }}
      >
        {/* Custom overlay since SheetOverlay does not work with modal={false} */}
        <div
          className={cn('fade-in animate-in fixed inset-0 z-50 bg-black/20 transition-opacity duration-300', {
            'pointer-events-none opacity-0': !open,
          })}
        />
        <SheetContent ref={sheetRef}>
          <CreateSubscriberForm onSuccess={() => navigate(-1)} />
        </SheetContent>
      </Sheet>
      <FormProtection onClose={() => setOpen(false)} showAlert={showAlert} setShowAlert={setShowAlert} />
    </>
  );
}
