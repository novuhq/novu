import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { RiGroup2Line, RiInformationFill } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { ExternalToast } from 'sonner';
import { z } from 'zod';
import { NovuApiError } from '@/api/api.client';
import { Button } from '@/components/primitives/button';
import { Form, FormRoot } from '@/components/primitives/form/form';
import { Separator } from '@/components/primitives/separator';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetMain } from '@/components/primitives/sheet';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { CreateSubscriberForm } from '@/components/subscribers/create-subscriber-form';
import { useSubscribersNavigate } from '@/components/subscribers/hooks/use-subscribers-navigate';
import { CreateSubscriberFormSchema } from '@/components/subscribers/schema';
import TruncatedText from '@/components/truncated-text';
import { useCombinedRefs } from '@/hooks/use-combined-refs';
import { useCreateSubscriber } from '@/hooks/use-create-subscriber';
import { useFormProtection } from '@/hooks/use-form-protection';
import { useOnElementUnmount } from '@/hooks/use-on-element-unmount';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';
import { cn } from '@/utils/ui';
import { generateUUID } from '@/utils/uuid';

const toastOptions: ExternalToast = {
  position: 'bottom-right',
  classNames: {
    toast: 'mb-4 right-0 pointer-events-none',
  },
};

export function CreateSubscriberPage() {
  const [open, setOpen] = useState(true);
  const track = useTelemetry();
  const { navigateToSubscribersCurrentPage, navigateToSubscribersFirstPage } = useSubscribersNavigate();

  const form = useForm<z.infer<typeof CreateSubscriberFormSchema>>({
    defaultValues: {
      data: '',
      subscriberId: generateUUID(),
      avatar: '',
      firstName: '',
      lastName: '',
      locale: '',
      phone: '',
      timezone: '',
      email: '',
    },
    resolver: zodResolver(CreateSubscriberFormSchema),
    shouldFocusError: false,
    mode: 'onBlur',
  });

  const { createSubscriber, isPending } = useCreateSubscriber({
    onSuccess: () => {
      showSuccessToast('Created subscriber successfully', undefined, toastOptions);
      track(TelemetryEvent.SUBSCRIBER_CREATED);
      navigateToSubscribersFirstPage();
    },
    onError: (error) => {
      // Check if it's a conflict error (subscriber already exists)
      if (error instanceof NovuApiError && error.status === 409) {
        // Set error on the subscriberId field specifically
        form.setError('subscriberId', {
          type: 'manual',
          message: 'A subscriber with this ID already exists',
        });
      }

      const errMsg = error instanceof Error ? error.message : 'Failed to create subscriber';
      showErrorToast(errMsg, undefined, toastOptions);
    },
  });

  const {
    protectedOnValueChange,
    ProtectionAlert,
    ref: protectionRef,
  } = useFormProtection({
    onValueChange: setOpen,
  });

  const { ref: unmountRef } = useOnElementUnmount({
    callback: () => {
      navigateToSubscribersCurrentPage();
    },
    condition: !open,
  });

  const combinedRef = useCombinedRefs(unmountRef, protectionRef);

  const onSubmit = async (formData: z.infer<typeof CreateSubscriberFormSchema>) => {
    const dirtyFields = form.formState.dirtyFields;

    const dirtyPayload = Object.keys(dirtyFields).reduce<Partial<typeof formData>>((acc, key) => {
      const typedKey = key as keyof typeof formData;

      if (typedKey === 'data') {
        const data = JSON.parse(JSON.stringify(formData.data));
        return { ...acc, data: data === '' ? {} : data };
      }

      return { ...acc, [typedKey]: formData[typedKey]?.trim() };
    }, {});

    form.reset({ ...formData, data: JSON.stringify(formData.data) });
    await createSubscriber({
      subscriber: { ...dirtyPayload, subscriberId: formData.subscriberId },
    });
  };

  return (
    <>
      <Sheet modal={false} open={open} onOpenChange={protectedOnValueChange}>
        {/* Custom overlay since SheetOverlay does not work with modal={false} */}
        <div
          className={cn('fade-in animate-in fixed inset-0 z-50 bg-black/20 transition-opacity duration-300', {
            'pointer-events-none opacity-0': !open,
          })}
        />
        <SheetContent ref={combinedRef}>
          <SheetHeader className="p-0">
            <header className="border-bg-soft flex h-12 w-full flex-row items-center gap-3 border-b p-3.5">
              <div className="flex flex-1 items-center gap-1 overflow-hidden text-sm font-medium">
                <RiGroup2Line className="size-5 p-0.5" />
                <TruncatedText className="flex-1">Add subscriber</TruncatedText>
              </div>
            </header>
          </SheetHeader>
          <SheetMain className="p-0">
            <Form {...form}>
              <FormRoot
                id="create-subscriber-form"
                autoComplete="off"
                noValidate
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex h-full flex-col"
              >
                <CreateSubscriberForm />
              </FormRoot>
            </Form>
          </SheetMain>
          <Separator />
          <SheetFooter className="p-0">
            <div className="flex w-full items-center justify-between gap-3 p-3">
              <div className="text-2xs flex items-center gap-1 text-neutral-600">
                <RiInformationFill className="size-4" />
                <span>
                  Looking for no-PII handling?{' '}
                  <Link
                    className="text-2xs text-neutral-600 underline"
                    to="https://docs.novu.co/additional-resources/security#what-should-i-do-if-i-have-regulatory-or-security-issues-with-pii"
                    target="_blank"
                  >
                    Learn more
                  </Link>
                </span>
              </div>
              <Button
                variant="secondary"
                type="submit"
                disabled={isPending}
                isLoading={isPending}
                form="create-subscriber-form"
              >
                Create subscriber
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      {ProtectionAlert}
    </>
  );
}
