import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/primitives/accordion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { RiInformationLine } from 'react-icons/ri';
import { EditableJsonViewer } from '../shared/editable-json-viewer/editable-json-viewer';
import { SubscriberAutocomplete } from '@/components/subscribers/subscriber-autocomplete';
import { SubscriberSectionProps } from '../types/preview-context.types';
import { ACCORDION_STYLES } from '../constants/preview-context.constants';

export function PreviewSubscriberSection({
  errors,
  localParsedData,
  onUpdate,
  onSubscriberSelect,
}: SubscriberSectionProps) {
  return (
    <AccordionItem value="subscriber" className={ACCORDION_STYLES.item}>
      <AccordionTrigger className={ACCORDION_STYLES.trigger}>
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
      </AccordionTrigger>
      <AccordionContent className="flex flex-col gap-2">
        <SubscriberAutocomplete
          value=""
          onChange={() => {}}
          onSelectSubscriber={onSubscriberSelect}
          size="xs"
          className="w-full"
        />
        <div className="flex flex-1 flex-col gap-2 overflow-auto">
          <EditableJsonViewer
            value={localParsedData.subscriber}
            onChange={(updatedData) => onUpdate('subscriber', updatedData)}
            className={ACCORDION_STYLES.jsonViewer}
          />
          {errors.subscriber && <p className="text-destructive text-xs">{errors.subscriber}</p>}
        </div>
        <div className="text-text-soft flex items-center gap-1.5 text-[10px] font-normal leading-[13px]">
          <RiInformationLine className="h-3 w-3 flex-shrink-0" />
          <span>Changes here only affect the preview and won't be saved to the subscriber.</span>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
