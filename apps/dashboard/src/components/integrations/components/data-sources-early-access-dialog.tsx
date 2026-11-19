import { CaretSortIcon } from '@radix-ui/react-icons';
import { useMutation } from '@tanstack/react-query';
import type { FormEvent, ReactElement } from 'react';
import { useId, useState } from 'react';
import { RiArrowRightSLine, RiCheckLine, RiCloseLine, RiMoreLine } from 'react-icons/ri';
import {
  SiGooglebigquery,
  SiHubspot,
  SiMixpanel,
  SiPostgresql,
  SiSalesforce,
  SiShopify,
  SiSnowflake,
  SiStripe,
} from 'react-icons/si';
import { NovuApiError, post } from '@/api/api.client';
import { Button } from '@/components/primitives/button';
import { CompactButton } from '@/components/primitives/button-compact';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/primitives/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { DismissButton, Icon as TagIcon, Root as TagRoot } from '@/components/primitives/tag';
import { Textarea } from '@/components/primitives/textarea';
import { cn } from '@/utils/ui';

type DataSource = { id: string; label: string; icon: ReactElement };

const DATA_SOURCES: DataSource[] = [
  {
    id: 'segment',
    label: 'Segment',
    icon: <img src="/images/data-sources/segment.png" alt="" className="size-4" />,
  },
  { id: 'hubspot', label: 'HubSpot', icon: <SiHubspot className="size-4 shrink-0 text-[#FF7A59]" aria-hidden /> },
  {
    id: 'salesforce',
    label: 'Salesforce',
    icon: <SiSalesforce className="size-4 shrink-0 text-[#00A1E0]" aria-hidden />,
  },
  { id: 'stripe', label: 'Stripe', icon: <SiStripe className="size-4 shrink-0 text-[#635BFF]" aria-hidden /> },
  { id: 'mixpanel', label: 'Mixpanel', icon: <SiMixpanel className="size-4 shrink-0 text-[#7856FF]" aria-hidden /> },
  { id: 'snowflake', label: 'Snowflake', icon: <SiSnowflake className="size-4 shrink-0 text-[#29B5E8]" aria-hidden /> },
  {
    id: 'bigquery',
    label: 'BigQuery',
    icon: <SiGooglebigquery className="size-4 shrink-0 text-[#4285F4]" aria-hidden />,
  },
  {
    id: 'postgresql',
    label: 'PostgreSQL',
    icon: <SiPostgresql className="size-4 shrink-0 text-[#4169E1]" aria-hidden />,
  },
  { id: 'shopify', label: 'Shopify', icon: <SiShopify className="size-4 shrink-0 text-[#7AB55C]" aria-hidden /> },
  { id: 'other', label: 'Other', icon: <RiMoreLine className="text-text-sub size-4 shrink-0" aria-hidden /> },
];

type FormErrors = { sources?: string; useCase?: string };

type DataSourcesEarlyAccessRequestBody = {
  plannedSources: { id: string; label: string }[];
  useCase: string;
};

type DataSourcesEarlyAccessDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Early access request for data sources; same flow and look as the agents early access request. */
export function DataSourcesEarlyAccessDialog({ open, onOpenChange }: DataSourcesEarlyAccessDialogProps) {
  const formId = useId();
  const sourcesLabelId = `${formId}-sources`;
  const useCaseFieldId = `${formId}-use-case`;

  const [sourceIds, setSourceIds] = useState<string[]>([]);
  const [useCase, setUseCase] = useState('');
  const [isSourceMenuOpen, setIsSourceMenuOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (body: DataSourcesEarlyAccessRequestBody) =>
      post<{ success: boolean }>('/support/data-sources-early-access', { body }),
  });

  const selectedSources = DATA_SOURCES.filter((source) => sourceIds.includes(source.id));

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSourceIds([]);
      setUseCase('');
      setIsSourceMenuOpen(false);
      setFormErrors({});
    }

    onOpenChange(next);
  };

  const toggleSource = (id: string) => {
    setFormErrors((prev) => ({ ...prev, sources: undefined }));
    setSourceIds((prev) => (prev.includes(id) ? prev.filter((other) => other !== id) : [...prev, id]));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const trimmedUseCase = useCase.trim();
    const nextErrors: FormErrors = {
      sources: sourceIds.length === 0 ? 'Select at least one data source.' : undefined,
      useCase: trimmedUseCase ? undefined : 'Tell us what you would use it for.',
    };

    if (nextErrors.sources || nextErrors.useCase) {
      setFormErrors(nextErrors);

      return;
    }

    try {
      await mutateAsync({
        plannedSources: selectedSources.map(({ id, label }) => ({ id, label })),
        useCase: trimmedUseCase,
      });
      showSuccessToast('We received your request and will be in touch.', 'Early access');
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
              Request early access
            </DialogTitle>
            <DialogDescription className="text-text-soft text-label-xs leading-4">
              Tell us where your customer data lives and we&apos;ll reach out when data sources are enabled for your
              account.
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
              <span className="text-text-strong text-label-xs font-medium" id={sourcesLabelId}>
                Which data sources do you want to connect?
              </span>
              <Popover open={isSourceMenuOpen} onOpenChange={setIsSourceMenuOpen} modal={false}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'border-stroke-soft bg-bg-white shadow-xs flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border px-1 py-1 text-left ring-inset',
                      formErrors.sources && 'border-destructive ring-error-base ring-1'
                    )}
                    aria-invalid={formErrors.sources ? true : undefined}
                    aria-labelledby={sourcesLabelId}
                  >
                    {selectedSources.length === 0 && (
                      <span className="text-text-soft text-label-xs px-1 py-0.5">Select data sources</span>
                    )}
                    {selectedSources.map((source) => (
                      <TagRoot
                        key={source.id}
                        variant="gray"
                        className={cn(
                          'text-text-strong border-stroke-soft bg-bg-weak-50 h-auto min-h-5 gap-1 rounded border px-1 py-0.5',
                          'hover:bg-bg-white-0 hover:ring-stroke-soft ring-0 hover:ring-1 hover:ring-inset'
                        )}
                      >
                        <TagIcon
                          as="span"
                          className="mx-0 flex size-4 shrink-0 items-center justify-center *:size-4 *:max-h-4 *:max-w-4"
                        >
                          {source.icon}
                        </TagIcon>
                        <span className="text-label-xs font-medium leading-4">{source.label}</span>
                        <DismissButton
                          className="mx-0 -mr-px ml-0.5 size-4 shrink-0"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleSource(source.id);
                          }}
                        />
                      </TagRoot>
                    ))}
                    <CaretSortIcon className="text-text-soft ml-auto size-3 shrink-0 opacity-50" aria-hidden />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  portal={false}
                  className="border-stroke-soft z-60 w-(--radix-popover-trigger-width) p-1"
                  align="start"
                  sideOffset={4}
                  collisionPadding={8}
                >
                  <div className="max-h-56 overflow-y-auto">
                    {DATA_SOURCES.map((source) => {
                      const isSelected = sourceIds.includes(source.id);

                      return (
                        <button
                          key={source.id}
                          type="button"
                          className={cn(
                            'hover:bg-bg-weak text-label-xs flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left',
                            isSelected && 'bg-bg-weak'
                          )}
                          onClick={() => toggleSource(source.id)}
                        >
                          <span className="flex size-4 shrink-0 items-center justify-center">{source.icon}</span>
                          <span className="text-text-strong flex-1">{source.label}</span>
                          {isSelected ? (
                            <RiCheckLine className="text-primary-base size-4 shrink-0" aria-hidden />
                          ) : (
                            <span className="size-4 shrink-0" aria-hidden />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
              {formErrors.sources && (
                <p className="text-error-base text-label-xs" role="alert">
                  {formErrors.sources}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor={useCaseFieldId} className="text-text-strong text-label-xs font-medium">
                What would you use it for?
              </label>
              <Textarea
                id={useCaseFieldId}
                placeholder="For example: keep subscriber plans in sync from Stripe."
                maxLength={200}
                showCounter
                hasError={Boolean(formErrors.useCase)}
                value={useCase}
                onChange={(event) => {
                  setUseCase(event.target.value);
                  setFormErrors((prev) => ({ ...prev, useCase: undefined }));
                }}
                className="min-h-[88px]"
                aria-invalid={formErrors.useCase ? true : undefined}
              />
              {formErrors.useCase && (
                <p className="text-error-base text-label-xs" role="alert">
                  {formErrors.useCase}
                </p>
              )}
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
              Request access
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
