import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/primitives/accordion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { RiInformationLine } from 'react-icons/ri';
import { EditableJsonViewer } from '../shared/editable-json-viewer/editable-json-viewer';
import { PayloadSectionProps } from '../types/preview-context.types';
import { ACCORDION_STYLES } from '../constants/preview-context.constants';
import { ClearPersistedDataButton } from './clear-persisted-data-button';

export function PreviewPayloadSection({
  errors,
  localParsedData,
  workflow,
  onUpdate,
  onClearPersisted,
}: PayloadSectionProps) {
  return (
    <AccordionItem value="payload" className={ACCORDION_STYLES.item}>
      <AccordionTrigger className={ACCORDION_STYLES.trigger}>
        <div className="flex w-full items-center justify-between">
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
          {onClearPersisted && (
            <div className="mr-2">
              <ClearPersistedDataButton onClear={onClearPersisted} />
            </div>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent className="flex flex-col gap-2">
        <div className="flex flex-1 flex-col gap-2 overflow-auto">
          <EditableJsonViewer
            value={localParsedData.payload}
            onChange={(updatedData) => onUpdate('payload', updatedData)}
            schema={workflow?.payloadSchema}
            className={ACCORDION_STYLES.jsonViewer}
          />
          {errors.payload && <p className="text-destructive text-xs">{errors.payload}</p>}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
