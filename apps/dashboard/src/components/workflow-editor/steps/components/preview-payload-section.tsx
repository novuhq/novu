import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/primitives/accordion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { RiInformationLine, RiRefreshLine, RiSettings3Line } from 'react-icons/ri';
import { EditableJsonViewer } from '../shared/editable-json-viewer/editable-json-viewer';
import { PayloadSectionProps } from '../types/preview-context.types';
import { ACCORDION_STYLES } from '../constants/preview-context.constants';
import { Button } from '../../../primitives/button';
import { Hint, HintIcon } from '../../../primitives/hint';
import { ResourceOriginEnum } from '@novu/shared';

export function PreviewPayloadSection({
  errors,
  localParsedData,
  workflow,
  onUpdate,
  onClearPersisted,
  hasDigestStep,
  onManageSchema,
}: PayloadSectionProps & { onManageSchema?: () => void }) {
  return (
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
          {onClearPersisted && workflow?.origin === ResourceOriginEnum.NOVU_CLOUD && (
            <div className="mr-2">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();

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
        {onManageSchema && workflow?.origin === ResourceOriginEnum.NOVU_CLOUD && (
          <div className="text-text-soft flex items-center gap-1.5 text-[10px] font-normal leading-[13px]">
            <RiInformationLine className="h-3 w-3 flex-shrink-0" />
            <span>
              Manage required fields and validations with{' '}
              <b
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onManageSchema();
                }}
                className="text-foreground-600 cursor-pointer font-medium"
              >
                Payload schema ↗
              </b>
            </span>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}
