import { forwardRef, useState } from 'react';
import { RiArrowRightSLine, RiDiscussLine } from 'react-icons/ri';
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
import TruncatedText from '@/components/truncated-text';
import { useCombinedRefs } from '@/hooks/use-combined-refs';
import { useFormProtection } from '@/hooks/use-form-protection';
import { useOnElementUnmount } from '@/hooks/use-on-element-unmount';
import { cn } from '@/utils/ui';
import { CreateTopicForm } from './create-topic-form';

type CreateTopicDrawerProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export const CreateTopicDrawer = forwardRef<HTMLDivElement, CreateTopicDrawerProps>((props, forwardedRef) => {
  const { isOpen, onOpenChange, onSuccess, onCancel } = props;
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    if (onSuccess) {
      onSuccess();
    }
  };

  return (
    <>
      <Sheet modal={false} open={isOpen} onOpenChange={protectedOnValueChange}>
        {/* Custom overlay since SheetOverlay does not work with modal={false} */}
        <div
          className={cn('fade-in animate-in fixed inset-0 z-50 bg-black/20 transition-opacity duration-300', {
            'pointer-events-none opacity-0': !isOpen,
          })}
        />
        <SheetContent ref={combinedRef} className="w-[400px]" aria-describedby="create-topic-description">
          <SheetHeader className="p-0">
            <SheetTitle className="sr-only">Add topic</SheetTitle>
            <header className="border-bg-soft flex h-12 w-full flex-row items-center gap-3 border-b p-3.5">
              <div className="flex flex-1 items-center gap-1 overflow-hidden text-sm font-medium">
                <RiDiscussLine className="size-5 p-0.5" />
                <TruncatedText className="flex-1">Add topic</TruncatedText>
              </div>
            </header>
          </SheetHeader>
          <SheetDescription id="create-topic-description" className="sr-only">
            Create a new topic to organize and manage your notifications
          </SheetDescription>
          <SheetMain className="p-0">
            <CreateTopicForm
              onSuccess={handleSuccess}
              onError={() => setIsSubmitting(false)}
              onSubmitStart={() => setIsSubmitting(true)}
            />
          </SheetMain>
          <Separator />
          <SheetFooter className="p-0">
            <div className="flex w-full items-center justify-end gap-3 p-3">
              <Button
                variant="secondary"
                size="xs"
                mode="gradient"
                type="submit"
                disabled={isSubmitting}
                isLoading={isSubmitting}
                trailingIcon={RiArrowRightSLine}
                form="create-topic-form"
              >
                Create topic
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      {ProtectionAlert}
    </>
  );
});
