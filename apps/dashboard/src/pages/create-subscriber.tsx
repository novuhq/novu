import { Sheet, SheetContent } from '@/components/primitives/sheet';
import { CreateSubscriberForm } from '@/components/subscribers/create-subscriber-form';
import { useOnElementUnmount } from '@/hooks/use-on-element-unmount';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function CreateSubscriberPage() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const sheetRef = useRef<HTMLDivElement>(null);

  useOnElementUnmount({
    element: sheetRef.current,
    callback: () => {
      navigate(-1);
    },
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent ref={sheetRef}>
        <CreateSubscriberForm onSuccess={() => navigate(-1)} />
      </SheetContent>
    </Sheet>
  );
}
