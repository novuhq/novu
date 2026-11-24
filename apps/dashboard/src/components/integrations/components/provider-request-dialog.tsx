import { useMutation } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { useEffect, useId, useState } from 'react';
import { RiArrowRightSLine, RiCloseLine } from 'react-icons/ri';
import { NovuApiError, post } from '@/api/api.client';
import { Button } from '@/components/primitives/button';
import { CompactButton } from '@/components/primitives/button-compact';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/primitives/dialog';
import { Input } from '@/components/primitives/input';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { Textarea } from '@/components/primitives/textarea';

type ProviderRequestBody = { providerName: string; useCase?: string };

type ProviderRequestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Prefills the provider name, e.g. with the search that found nothing. */
  defaultProviderName?: string;
};

/** Asks the Novu team for a provider that isn't in the store; same look as the early access requests. */
export function ProviderRequestDialog({ open, onOpenChange, defaultProviderName = '' }: ProviderRequestDialogProps) {
  const formId = useId();
  const nameFieldId = `${formId}-name`;
  const useCaseFieldId = `${formId}-use-case`;

  const [providerName, setProviderName] = useState(defaultProviderName);
  const [useCase, setUseCase] = useState('');
  const [nameError, setNameError] = useState<string>();

  useEffect(() => {
    if (open) setProviderName(defaultProviderName);
  }, [open, defaultProviderName]);

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (body: ProviderRequestBody) => post<{ success: boolean }>('/support/provider-request', { body }),
  });

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setUseCase('');
      setNameError(undefined);
    }

    onOpenChange(next);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const trimmedName = providerName.trim();

    if (!trimmedName) {
      setNameError('Enter the provider you need.');

      return;
    }

    try {
      await mutateAsync({ providerName: trimmedName, useCase: useCase.trim() || undefined });
      showSuccessToast('We received your request and will be in touch.', 'Provider request');
      handleOpenChange(false);
    } catch (err) {
      showErrorToast(
        err instanceof NovuApiError ? err.message : 'Something went wrong. Please try again.',
        'Request failed'
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="border-stroke-soft max-w-[440px] gap-0 overflow-visible rounded-xl border p-0 shadow-xl"
        hideCloseButton
      >
        <div className="bg-bg-weak flex items-start gap-2 p-4">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <DialogTitle className="text-text-strong text-[16px] font-medium leading-6 tracking-tight">
              Request a provider
            </DialogTitle>
            <DialogDescription className="text-text-soft text-label-xs leading-4">
              Tell us which provider you need and we&apos;ll let you know when it&apos;s in the store.
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <CompactButton size="md" variant="ghost" icon={RiCloseLine}>
              <span className="sr-only">Close</span>
            </CompactButton>
          </DialogClose>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="border-stroke-soft bg-background flex flex-col gap-5 border-y p-4">
            <div className="flex flex-col gap-1">
              <label htmlFor={nameFieldId} className="text-text-strong text-label-xs font-medium">
                Provider
              </label>
              <Input
                id={nameFieldId}
                size="xs"
                placeholder="For example: Pigeon"
                maxLength={100}
                value={providerName}
                hasError={!!nameError}
                onChange={(event) => {
                  setProviderName(event.target.value);
                  setNameError(undefined);
                }}
                aria-invalid={nameError ? true : undefined}
              />
              {nameError && (
                <p className="text-error-base text-label-xs" role="alert">
                  {nameError}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor={useCaseFieldId} className="text-text-strong text-label-xs font-medium">
                What would you send with it? <span className="text-text-soft font-normal">(optional)</span>
              </label>
              <Textarea
                id={useCaseFieldId}
                placeholder="A sentence or two is good."
                maxLength={200}
                showCounter
                value={useCase}
                onChange={(event) => setUseCase(event.target.value)}
                className="min-h-[88px]"
              />
            </div>
          </div>

          <div className="flex justify-end p-3">
            <Button
              variant="secondary"
              mode="gradient"
              size="xs"
              trailingIcon={RiArrowRightSLine}
              type="submit"
              isLoading={isPending}
            >
              Send request
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
