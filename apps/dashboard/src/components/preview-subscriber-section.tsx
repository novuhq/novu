import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/primitives/accordion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { RiInformationLine, RiRefreshLine } from 'react-icons/ri';
import { useState } from 'react';
import { EditableJsonViewer } from './workflow-editor/steps/shared/editable-json-viewer/editable-json-viewer';
import { SubscriberAutocomplete } from '@/components/subscribers/subscriber-autocomplete';
import { SubscriberSectionProps } from './workflow-editor/steps/types/preview-context.types';
import { ACCORDION_STYLES } from './workflow-editor/steps/constants/preview-context.constants';
import { buttonVariants } from './primitives/button';
import { cn } from '@/utils/ui';

export function PreviewSubscriberSection({
  error,
  subscriber,
  onUpdate,
  onSubscriberSelect,
  onClearPersisted,
}: SubscriberSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');

  return (
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
                  Information about the recipient of the notification, including their profile data and preferences.
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          {onClearPersisted && (
            <div className="mr-2">
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();

                  onClearPersisted();
                }}
                className={cn(
                  buttonVariants({ variant: 'secondary', mode: 'ghost', size: '2xs' }),
                  'text-foreground-600 flex items-center gap-1'
                )}
                aria-label="Reset defaults"
                role="button"
              >
                <RiRefreshLine className="h-3 w-3" />
                <span className="text-xs leading-none">Reset defaults</span>
              </div>
            </div>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent className="flex flex-col gap-2">
        <SubscriberAutocomplete
          value={searchQuery}
          onChange={setSearchQuery}
          onSelectSubscriber={(subscriber) => {
            onSubscriberSelect(subscriber);
            setSearchQuery('');
          }}
          size="xs"
          className="w-full"
        />
        <div className="flex flex-1 flex-col gap-2 overflow-auto">
          <EditableJsonViewer
            value={subscriber}
            onChange={(updatedData) => onUpdate('subscriber', updatedData)}
            className={ACCORDION_STYLES.jsonViewer}
          />
          {error && <p className="text-destructive text-xs">{error}</p>}
        </div>
        <div className="text-text-soft flex items-center gap-1.5 text-[10px] font-normal leading-[13px]">
          <RiInformationLine className="h-3 w-3 flex-shrink-0" />
          <span>Changes here only affect the preview and won't be saved to the subscriber.</span>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
