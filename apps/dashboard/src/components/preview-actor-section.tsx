import { useState } from 'react';
import { RiInformation2Line, RiRefreshLine } from 'react-icons/ri';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/primitives/accordion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { SubscriberAutocomplete } from '@/components/subscribers/subscriber-autocomplete';
import { Button } from './primitives/button';
import { ACCORDION_STYLES } from './workflow-editor/steps/constants/preview-context.constants';
import { EditableJsonViewer } from './workflow-editor/steps/shared/editable-json-viewer/editable-json-viewer';
import { ActorSectionProps } from './workflow-editor/steps/types/preview-context.types';

export function PreviewActorSection({
  error,
  actor,
  schema,
  onUpdate,
  onActorSelect,
  onClearPersisted,
}: ActorSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <AccordionItem value="actor" className={ACCORDION_STYLES.item}>
      <AccordionTrigger
        className={ACCORDION_STYLES.trigger}
        rightSlot={
          onClearPersisted ? (
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
              Actor
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-foreground-400 inline-block hover:cursor-help">
                    <RiInformation2Line className="size-3" />
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  The actor sent during workflow trigger. Use actor variables like {'{{actor.firstName}}'} in step
                  content.
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
            onActorSelect(subscriber);
            setSearchQuery('');
          }}
          size="xs"
          className="w-full"
        />
        <div className="flex flex-1 flex-col gap-2 overflow-auto">
          <EditableJsonViewer
            value={actor}
            onChange={(updatedData) => onUpdate('actor', updatedData)}
            schema={schema}
            className={ACCORDION_STYLES.jsonViewer}
          />
          {error && <p className="text-destructive text-xs">{error}</p>}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
