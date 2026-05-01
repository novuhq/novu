import { SLUG_IDENTIFIER_REGEX, slugIdentifierFormatMessage, slugify } from '@novu/shared';
import type { FormEvent, ReactNode } from 'react';
import { useId, useState } from 'react';
import { RiArrowRightSLine, RiCloseLine, RiExternalLinkLine, RiInformationFill } from 'react-icons/ri';
import type { CreateAgentBody } from '@/api/agents';
import { Button } from '@/components/primitives/button';
import { CompactButton } from '@/components/primitives/button-compact';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/primitives/dialog';
import { Hint, HintIcon } from '@/components/primitives/hint';
import { Input } from '@/components/primitives/input';
import { Textarea } from '@/components/primitives/textarea';

const DOCS_AGENTS_LEARN_MORE_HREF = 'https://docs.novu.co';

type CreateAgentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (body: CreateAgentBody) => Promise<void>;
  isSubmitting: boolean;
};

type FormErrors = {
  name?: string;
  identifier?: string;
};

function RequiredFieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-text-strong flex items-center gap-px text-label-xs font-medium">
      <span>{children}</span>
      <span className="text-primary-base text-label-sm leading-5 tracking-tight" aria-hidden>
        *
      </span>
    </label>
  );
}

export function CreateAgentDialog({ open, onOpenChange, onSubmit, isSubmitting }: CreateAgentDialogProps) {
  const formId = useId();
  const nameId = `${formId}-name`;
  const identifierId = `${formId}-identifier`;
  const descriptionId = `${formId}-description`;

  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  // Once the user edits the identifier manually, stop auto-syncing it from the name.
  const [isIdentifierTouched, setIsIdentifierTouched] = useState(false);

  const reset = () => {
    setName('');
    setIdentifier('');
    setDescription('');
    setErrors({});
    setIsIdentifierTouched(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      reset();
    }

    onOpenChange(next);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    const trimmedIdentifier = identifier.trim();
    const nextErrors: FormErrors = {};

    if (!trimmedName) {
      nextErrors.name = 'Name is required.';
    }

    if (!trimmedIdentifier) {
      nextErrors.identifier = 'Identifier is required.';
    } else if (!SLUG_IDENTIFIER_REGEX.test(trimmedIdentifier)) {
      nextErrors.identifier = slugIdentifierFormatMessage('identifier');
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);

      return;
    }

    setErrors({});

    const body: CreateAgentBody = {
      name: trimmedName,
      identifier: trimmedIdentifier,
    };

    const trimmedDescription = description.trim();

    if (trimmedDescription) {
      body.description = trimmedDescription;
    }

    await onSubmit(body);
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="border-stroke-soft max-w-[440px] gap-0 overflow-hidden rounded-12 border p-0 shadow-xl sm:rounded-12"
        hideCloseButton
      >
        <div className="bg-bg-weak flex flex-col gap-3 p-4">
          <div className="flex items-start gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <DialogTitle className="text-text-strong text-[16px] font-medium leading-6 tracking-[-0.176px]">
                Add agent
              </DialogTitle>
              <DialogDescription className="text-text-soft text-label-xs leading-4">
                Give your agent a unified way to communicate with your users.{' '}
                <a
                  href={DOCS_AGENTS_LEARN_MORE_HREF}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-text-soft hover:text-text-sub inline-flex items-center gap-0.5 underline-offset-2 hover:underline"
                >
                  Learn more
                  <RiExternalLinkLine className="size-3.5 shrink-0" aria-hidden />
                </a>
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <CompactButton size="md" variant="ghost" icon={RiCloseLine}>
                <span className="sr-only">Close</span>
              </CompactButton>
            </DialogClose>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="border-stroke-soft bg-background border-y">
            <div className="flex flex-col gap-5 p-4">
              <div className="flex flex-col gap-2">
                <RequiredFieldLabel htmlFor={nameId}>Agent name</RequiredFieldLabel>
                <Input
                  id={nameId}
                  size="2xs"
                  value={name}
                  onChange={(e) => {
                    const nextName = e.target.value;
                    setName(nextName);
                    setErrors((prev) => ({ ...prev, name: undefined }));

                    if (!isIdentifierTouched) {
                      setIdentifier(slugify(nextName));
                      setErrors((prev) => ({ ...prev, identifier: undefined }));
                    }
                  }}
                  placeholder="e.g. Wine Sommelier Agent"
                  hasError={Boolean(errors.name)}
                  aria-invalid={errors.name ? true : undefined}
                  aria-describedby={errors.name ? `${nameId}-error` : undefined}
                />
                {errors.name ? (
                  <p id={`${nameId}-error`} className="text-error-base text-label-xs" role="alert">
                    {errors.name}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-1">
                <RequiredFieldLabel htmlFor={identifierId}>Identifier</RequiredFieldLabel>
                <Input
                  id={identifierId}
                  size="2xs"
                  className="font-mono"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setIsIdentifierTouched(true);
                    setErrors((prev) => ({ ...prev, identifier: undefined }));
                  }}
                  placeholder="e.g. wine-sommelier-agent"
                  hasError={Boolean(errors.identifier)}
                  aria-invalid={errors.identifier ? true : undefined}
                  aria-describedby={
                    errors.identifier ? `${identifierId}-hint ${identifierId}-error` : `${identifierId}-hint`
                  }
                />
                <Hint id={`${identifierId}-hint`} className="text-text-soft text-paragraph-xs leading-4">
                  <HintIcon as={RiInformationFill} />
                  Used in code and APIs. Must be unique. Letters, numbers, hyphens, underscores, and dots only (no
                  spaces).
                </Hint>
                {errors.identifier ? (
                  <p id={`${identifierId}-error`} className="text-error-base text-label-xs" role="alert">
                    {errors.identifier}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor={descriptionId} className="text-text-strong text-label-xs font-medium">
                  Description
                </label>
                <Textarea
                  id={descriptionId}
                  placeholder="What does this agent do..."
                  maxLength={200}
                  showCounter
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-24 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end px-4 py-3">
            <Button
              variant="secondary"
              mode="gradient"
              size="xs"
              type="submit"
              isLoading={isSubmitting}
              trailingIcon={RiArrowRightSLine}
            >
              Setup agent
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
