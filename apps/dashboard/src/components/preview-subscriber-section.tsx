import { useState } from 'react';
import { RiEdit2Line, RiInformation2Line, RiRefreshLine } from 'react-icons/ri';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/primitives/accordion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { SubscriberAutocomplete } from '@/components/subscribers/subscriber-autocomplete';
import { Button } from './primitives/button';
import { ACCORDION_STYLES } from './workflow-editor/steps/constants/preview-context.constants';
import { EditableJsonViewer } from './workflow-editor/steps/shared/editable-json-viewer/editable-json-viewer';
import { SubscriberSectionProps } from './workflow-editor/steps/types/preview-context.types';

export function PreviewSubscriberSection({
  error,
  subscriber,
  schema,
  onUpdate,
  onSubscriberSelect,
  onClearPersisted,
  onEditSubscriber,
}: SubscriberSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <AccordionItem value="subscriber" className={ACCORDION_STYLES.item}>
      <AccordionTrigger
        className={ACCORDION_STYLES.trigger}
        rightSlot={
          onEditSubscriber ? (
            <div className="mr-2">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditSubscriber();
                }}
                type="button"
                variant="secondary"
                mode="ghost"
                size="2xs"
                className="text-foreground-600 gap-1"
              >
                <RiEdit2Line className="h-3 w-3" />
                Edit subscriber
              </Button>
            </div>
          ) : onClearPersisted ? (
            <div className="mr-2">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onClearPersisted();
                }}
                type="button"
                variant="secondary"
                mode="ghost"
                size="2xs"
                className="text-foreground-600 gap-1"
              >
                <RiRefreshLine className="h-3 w-3" />
                Reset defaults
              </Button>
            </div>
          ) : null
        }
      >
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              Subscriber
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-foreground-400 inline-block hover:cursor-help">
                    <RiInformation2Line className="size-3" />
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  Information about the recipient of the notification, including their profile data and preferences.
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
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
            schema={schema}
            className={ACCORDION_STYLES.jsonViewer}
            isReadOnly={!!onEditSubscriber}
          />
          {error && <p className="text-destructive text-xs">{error}</p>}
        </div>
        {onEditSubscriber && (
          <div className="text-text-soft flex items-center gap-1.5 text-[10px] font-normal leading-[13px]">
            <RiInformation2Line className="h-3 w-3 shrink-0" />
            <span>Click "Edit subscriber" above to modify subscriber details.</span>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}
