import { useState, useMemo, useCallback, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { RiInformationLine, RiPencilLine, RiSearchLine } from 'react-icons/ri';
import { type WorkflowResponseDto, type ISubscriberResponseDto } from '@novu/shared';

import { Button } from '@/components/primitives/button';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/primitives/form/form';
import { Separator } from '@/components/primitives/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/primitives/accordion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { SubscriberAutocomplete } from '@/components/subscribers/subscriber-autocomplete';
import { SubscriberDrawer } from '@/components/subscribers/subscriber-drawer';
import { EditableJsonViewer } from '@/components/workflow-editor/steps/shared/editable-json-viewer/editable-json-viewer';
import { useIsPayloadSchemaEnabled } from '@/hooks/use-is-payload-schema-enabled';
import { useFetchSubscriber } from '@/hooks/use-fetch-subscriber';
import { useAuth } from '@/context/auth/hooks';
import { ACCORDION_STYLES } from '@/components/workflow-editor/steps/constants/preview-context.constants';
import { cn } from '@/utils/ui';
import { TestWorkflowFormType } from '../schema';

type TestWorkflowContentProps = {
  workflow?: WorkflowResponseDto;
};

type SubscriberDisplayData = {
  subscriberId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar: string;
  locale: string | null;
  timezone: string | null;
  data: any;
};

const DEFAULT_SUBSCRIBER_DATA: SubscriberDisplayData = {
  subscriberId: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  avatar: '',
  locale: null,
  timezone: null,
  data: null,
};

export function TestWorkflowContent({ workflow }: TestWorkflowContentProps) {
  const { control, setValue, watch } = useFormContext<TestWorkflowFormType>();
  const { currentUser } = useAuth();
  const [accordionValue, setAccordionValue] = useState(['payload', 'subscriber']);
  const [subscriberSearchQuery, setSubscriberSearchQuery] = useState('');
  const [subscriberData, setSubscriberData] = useState(DEFAULT_SUBSCRIBER_DATA);
  const [isSubscriberDrawerOpen, setIsSubscriberDrawerOpen] = useState(false);

  // Fetch subscriber data for the currently selected subscriber (starts with current user)
  const subscriberIdToFetch = subscriberData.subscriberId || currentUser?._id || '';
  const { data: fetchedSubscriberData, refetch: refetchSubscriber } = useFetchSubscriber({
    subscriberId: subscriberIdToFetch,
    options: {
      enabled: !!subscriberIdToFetch,
    },
  });

  const isPayloadSchemaEnabled = useIsPayloadSchemaEnabled();
  const payload = watch('payload');

  // Set subscriber data when fetched subscriber data is loaded
  useEffect(() => {
    if (fetchedSubscriberData) {
      const newSubscriberData: SubscriberDisplayData = {
        subscriberId: fetchedSubscriberData.subscriberId || '',
        firstName: fetchedSubscriberData.firstName || '',
        lastName: fetchedSubscriberData.lastName || '',
        email: fetchedSubscriberData.email || '',
        phone: fetchedSubscriberData.phone || '',
        avatar: fetchedSubscriberData.avatar || '',
        locale: fetchedSubscriberData.locale || null,
        timezone: fetchedSubscriberData.timezone || null,
        data: fetchedSubscriberData.data || null,
      };
      setSubscriberData(newSubscriberData);
    } else if (currentUser && !fetchedSubscriberData && !subscriberData.subscriberId) {
      // If no subscriber found but we have current user, use user data as fallback
      const fallbackSubscriberData: SubscriberDisplayData = {
        subscriberId: currentUser._id,
        firstName: currentUser.firstName || '',
        lastName: currentUser.lastName || '',
        email: currentUser.email || '',
        phone: '',
        avatar: '',
        locale: null,
        timezone: null,
        data: null,
      };
      setSubscriberData(fallbackSubscriberData);
    }
  }, [fetchedSubscriberData, currentUser, subscriberData.subscriberId]);

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

  const handleSubscriberSelect = useCallback((subscriber: ISubscriberResponseDto) => {
    const newSubscriberData: SubscriberDisplayData = {
      subscriberId: subscriber.subscriberId || '',
      firstName: subscriber.firstName || '',
      lastName: subscriber.lastName || '',
      email: subscriber.email || '',
      phone: subscriber.phone || '',
      avatar: subscriber.avatar || '',
      locale: subscriber.locale || null,
      timezone: subscriber.timezone || null,
      data: subscriber.data || null,
    };
    setSubscriberData(newSubscriberData);
    setSubscriberSearchQuery('');
  }, []);

  const handleSubscriberDrawerClose = useCallback(
    (open: boolean) => {
      setIsSubscriberDrawerOpen(open);

      // Refetch subscriber data when drawer closes to get latest updates
      if (!open && subscriberData.subscriberId) {
        refetchSubscriber();
      }
    },
    [refetchSubscriber, subscriberData.subscriberId]
  );

  const renderSubscriberRow = (label: string, value: any) => {
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
      {/* Header */}
      <div className="border-b border-neutral-200 px-3 py-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Test workflow</h2>
          <p className="text-sm text-neutral-600">
            Time to test the workflow you just built.{' '}
            <a href="#" className="underline">
              Learn more ↗
            </a>
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <Accordion type="multiple" value={accordionValue} onValueChange={setAccordionValue}>
          {/* Payload Section */}
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
                  render={({ field: { ref: _ref, ...restField } }) => (
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

          {/* Subscriber Section */}
          <AccordionItem value="subscriber" className={ACCORDION_STYLES.item}>
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
                      setIsSubscriberDrawerOpen(true);
                    }}
                    type="button"
                    variant="secondary"
                    mode="ghost"
                    size="2xs"
                    className="text-foreground-600 gap-1"
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
                  {renderSubscriberRow('subscriber.subscriberId', subscriberData.subscriberId)}
                  {renderSubscriberRow('subscriber.firstName', subscriberData.firstName)}
                  {renderSubscriberRow('subscriber.lastName', subscriberData.lastName)}
                  {renderSubscriberRow('subscriber.email', subscriberData.email)}
                  {renderSubscriberRow('subscriber.phone', subscriberData.phone)}
                  {renderSubscriberRow('subscriber.avatar', subscriberData.avatar)}
                  {renderSubscriberRow('subscriber.locale', subscriberData.locale)}
                  {renderSubscriberRow('subscriber.timezone', subscriberData.timezone)}
                  {renderSubscriberRow('subscriber.data', JSON.stringify(subscriberData.data))}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <SubscriberDrawer
        open={isSubscriberDrawerOpen}
        onOpenChange={handleSubscriberDrawerClose}
        subscriberId={subscriberData.subscriberId}
        closeOnSave={true}
      />
    </div>
  );
}
