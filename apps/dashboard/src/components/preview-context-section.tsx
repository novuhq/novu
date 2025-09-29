import { RiInformation2Line, RiRefreshLine } from 'react-icons/ri';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/primitives/accordion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { cn } from '@/utils/ui';
import { ContextSearchEditor } from './context-search-editor';
import { buttonVariants } from './primitives/button';
import { ACCORDION_STYLES } from './workflow-editor/steps/constants/preview-context.constants';
import { ContextSectionProps } from './workflow-editor/steps/types/preview-context.types';

export function PreviewContextSection({ error, context, schema, onUpdate, onClearPersisted }: ContextSectionProps) {
  return (
    <AccordionItem value="context" className={ACCORDION_STYLES.item}>
      <AccordionTrigger className={ACCORDION_STYLES.trigger}>
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              Context
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-foreground-400 inline-block hover:cursor-help">
                    <RiInformation2Line className="size-3" />
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  Context provides additional data that can be used in your workflow, such as tenant or
                  application-specific information.
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          {onClearPersisted && (
            <div className="mr-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onClearPersisted();
                }}
                className={cn(
                  buttonVariants({ variant: 'secondary', mode: 'ghost', size: '2xs' }),
                  'text-foreground-600 flex items-center gap-1'
                )}
                aria-label="Reset context"
              >
                <RiRefreshLine className="h-3 w-3" />
                <span className="text-xs leading-none">Reset defaults</span>
              </button>
            </div>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent className="flex flex-col gap-2">
        <ContextSearchEditor
          value={context}
          schema={schema}
          onUpdate={(updatedData) => onUpdate('context', updatedData)}
          error={error ?? undefined}
        />
        <div className="text-text-soft flex items-center gap-1.5 text-[10px] font-normal leading-[13px]">
          <RiInformation2Line className="h-3 w-3 flex-shrink-0" />
          <span>Changes here only affect the preview and won't be saved to the context.</span>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
