import { forwardRef, useId, useState } from 'react';
import { RiArrowRightSLine } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { Separator } from '@/components/primitives/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetMain,
  SheetTitle,
} from '@/components/primitives/sheet';
import { useCombinedRefs } from '@/hooks/use-combined-refs';
import { useFormProtection } from '@/hooks/use-form-protection';
import { useOnElementUnmount } from '@/hooks/use-on-element-unmount';
import { cn } from '@/utils/ui';
import { ExternalLink } from '../shared/external-link';
import { CreateContextForm } from './create-context-form';

type CreateContextDrawerProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export const CreateContextDrawer = forwardRef<HTMLDivElement, CreateContextDrawerProps>((props, forwardedRef) => {
  const { isOpen, onOpenChange, onSuccess, onCancel } = props;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const descriptionId = useId();
  const formId = useId();

  const {
    protectedOnValueChange,
    ProtectionAlert,
    ref: protectionRef,
  } = useFormProtection({
    onValueChange: onOpenChange,
  });

  const { ref: unmountRef } = useOnElementUnmount({
    callback: () => {
      if (onCancel) {
        onCancel();
      }
    },
    condition: !isOpen,
  });

  const combinedRef = useCombinedRefs(forwardedRef, unmountRef, protectionRef);

  const handleSuccess = () => {
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <>
      <Sheet modal={false} open={isOpen} onOpenChange={protectedOnValueChange}>
        <div
          className={cn('fade-in animate-in fixed inset-0 z-50 bg-black/20 transition-opacity duration-300', {
            'pointer-events-none opacity-0': !isOpen,
          })}
        />
        <SheetContent ref={combinedRef} className="w-[400px]" aria-describedby={descriptionId}>
          <SheetHeader className="px-5 py-5">
            <SheetTitle>Create context</SheetTitle>
            <SheetDescription>
              Contexts are flexible, user-defined data objects that help you organize and personalize your
              notifications.{' '}
              <ExternalLink href="https://docs.novu.co/platform/workflow/advanced-features/contexts">
                Learn more
              </ExternalLink>
            </SheetDescription>
          </SheetHeader>
          <Separator />
          <SheetMain className="px-5 py-5">
            <CreateContextForm
              onSuccess={handleSuccess}
              onError={() => setIsSubmitting(false)}
              onSubmitStart={() => setIsSubmitting(true)}
              formId={formId}
            />
          </SheetMain>
          <Separator />
          <SheetFooter className="justify-end">
            <Button
              variant="secondary"
              size="xs"
              mode="gradient"
              type="submit"
              disabled={isSubmitting}
              isLoading={isSubmitting}
              trailingIcon={RiArrowRightSLine}
              form={formId}
            >
              Create context
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      {ProtectionAlert}
    </>
  );
});
