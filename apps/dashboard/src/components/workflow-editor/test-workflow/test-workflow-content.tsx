import { type ISubscriberResponseDto, type WorkflowResponseDto } from '@novu/shared';
import { useCallback, useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { RiInformationLine, RiPencilLine, RiSearchLine } from 'react-icons/ri';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/primitives/accordion';
import { Button } from '@/components/primitives/button';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/primitives/form/form';
import { Skeleton } from '@/components/primitives/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { SubscriberAutocomplete } from '@/components/subscribers/subscriber-autocomplete';
import { ACCORDION_STYLES } from '@/components/workflow-editor/steps/constants/preview-context.constants';
import { EditableJsonViewer } from '@/components/workflow-editor/steps/shared/editable-json-viewer/editable-json-viewer';
import { useIsPayloadSchemaEnabled } from '@/hooks/use-is-payload-schema-enabled';
import { cn } from '@/utils/ui';

type TestWorkflowFormType = {
  payload: string; // This is the raw JSON string in the form
};

type TestWorkflowContentProps = {
  workflow?: WorkflowResponseDto;
  subscriberData: Partial<ISubscriberResponseDto> | null;
  isLoadingSubscriber?: boolean;
  onOpenSubscriberDrawer: () => void;
  onSubscriberSelect: (subscriber: ISubscriberResponseDto) => void;
};

export function TestWorkflowContent({
  workflow,
  subscriberData,
  isLoadingSubscriber = false,
  onOpenSubscriberDrawer,
  onSubscriberSelect,
}: TestWorkflowContentProps) {
  const { control, setValue, watch } = useFormContext<TestWorkflowFormType>();
  const [accordionValue, setAccordionValue] = useState(['payload', 'subscriber']);
  const [subscriberSearchQuery, setSubscriberSearchQuery] = useState('');

  const isPayloadSchemaEnabled = useIsPayloadSchemaEnabled();
  const payload = watch('payload');

  const payloadJsonData = useMemo(() => {
    try {
      return JSON.parse(payload || '{}');
    } catch {
      return {};
    }
  }, [payload]);

  const handleJsonChange = useCallback(
    (updatedData: any) => {
      try {
        const stringified = JSON.stringify(updatedData, null, 2);
        setValue('payload', stringified);
      } catch (error) {
        // Handle error silently
      }
    },
    [setValue]
  );

  const handleSubscriberSelect = useCallback(
    (subscriber: ISubscriberResponseDto) => {
      onSubscriberSelect(subscriber);
      setSubscriberSearchQuery('');
    },
    [onSubscriberSelect]
  );

  const renderSubscriberRow = (label: string, value?: string | null) => {
    if (isLoadingSubscriber) {
      return (
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <span className="text-foreground-400 tracking-tight">{label}</span>
          <Skeleton className="h-3 w-16" />
        </div>
      );
    }

    const displayValue = !value ? 'null' : String(value);
    const isNull = displayValue === 'null';

    return (
      <div className="flex items-center gap-1.5 font-mono text-xs">
        <span className="text-foreground-400 tracking-tight">{label}</span>
        <span className={cn('text-xs tracking-tight', isNull ? 'text-foreground-400 italic' : 'text-foreground-950')}>
          {displayValue}
        </span>
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-neutral-200 px-3 py-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-label-lg text-text-strong">Test workflow</h2>
          <p className="text-paragraph-xs text-text-soft">
            Time to test the workflow you just built.{' '}
            <a
              href="https://docs.novu.co/platform/concepts/trigger"
              target="_blank"
              className="underline"
              rel="noopener"
            >
              Learn more ↗
            </a>
          </p>
        </div>
      </div>

      <div className="bg-bg-weak flex-1 overflow-auto">
        <Accordion type="multiple" value={accordionValue} onValueChange={setAccordionValue}>
          <AccordionItem value="payload" className={ACCORDION_STYLES.item}>
            <AccordionTrigger className={ACCORDION_STYLES.trigger}>
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    Payload
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-foreground-400 inline-block hover:cursor-help">
                          <RiInformationLine className="size-3" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        The data that will be sent to your workflow when triggered. This can include dynamic values and
                        variables.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="flex flex-col gap-2">
              <div className="flex flex-1 flex-col gap-2 overflow-auto">
                <FormField
                  control={control}
                  name="payload"
                  render={({ field: { ref: _ref } }) => (
                    <FormItem className="flex flex-1 flex-col">
                      <FormControl>
                        <>
                          <EditableJsonViewer
                            value={payloadJsonData}
                            onChange={handleJsonChange}
                            schema={isPayloadSchemaEnabled ? workflow?.payloadSchema : undefined}
                            className={ACCORDION_STYLES.jsonViewer}
                          />
                          <FormMessage />
                        </>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="subscriber" className={cn(ACCORDION_STYLES.item, 'border-b-0')}>
            <AccordionTrigger className={ACCORDION_STYLES.trigger}>
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    Subscriber
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-foreground-400 inline-block hover:cursor-help">
                          <RiInformationLine className="size-3" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        Information about the recipient of the notification, including their profile data and
                        preferences.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                <div className="mr-2">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onOpenSubscriberDrawer();
                    }}
                    type="button"
                    variant="secondary"
                    mode="ghost"
                    size="2xs"
                    className="text-foreground-600 h-[18px] gap-1"
                  >
                    <RiPencilLine className="h-3 w-3" />
                    Edit subscriber
                  </Button>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="flex flex-col gap-2">
              <SubscriberAutocomplete
                value={subscriberSearchQuery}
                onChange={setSubscriberSearchQuery}
                onSelectSubscriber={handleSubscriberSelect}
                size="xs"
                className="w-full"
                placeholder="Search for a subscriber"
                trailingIcon={RiSearchLine}
              />
              <div className="flex flex-1 flex-col gap-2 overflow-auto">
                <div className="space-y-1">
                  {renderSubscriberRow('subscriber.subscriberId', subscriberData?.subscriberId)}
                  {renderSubscriberRow('subscriber.firstName', subscriberData?.firstName)}
                  {renderSubscriberRow('subscriber.lastName', subscriberData?.lastName)}
                  {renderSubscriberRow('subscriber.email', subscriberData?.email)}
                  {renderSubscriberRow('subscriber.phone', subscriberData?.phone)}
                  {renderSubscriberRow('subscriber.avatar', subscriberData?.avatar)}
                  {renderSubscriberRow('subscriber.locale', subscriberData?.locale)}
                  {renderSubscriberRow('subscriber.timezone', subscriberData?.timezone)}
                  {renderSubscriberRow('subscriber.data', JSON.stringify(subscriberData?.data))}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
