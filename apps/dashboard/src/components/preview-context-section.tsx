import { RiInformation2Line, RiRefreshLine } from 'react-icons/ri';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/primitives/accordion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { ContextSearchEditor } from './context-search-editor';
import { Button } from './primitives/button';
import { ExternalLink } from './shared/external-link';
import { ACCORDION_STYLES } from './workflow-editor/steps/constants/preview-context.constants';
import { ContextSectionProps } from './workflow-editor/steps/types/preview-context.types';

export function PreviewContextSection({
  error,
  context,
  schema,
  onUpdate,
  onClearPersisted,
  className,
}: ContextSectionProps) {
  return (
    <AccordionItem value="context" className={className ?? ACCORDION_STYLES.itemLast}>
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
                  application-specific information.{' '}
                  <ExternalLink
                    href="https://docs.novu.co/platform/workflow/advanced-features/contexts/contexts-in-workflows"
                    target="_blank"
                  >
                    Learn more
                  </ExternalLink>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          {onClearPersisted && (
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
        <ContextSearchEditor
          value={context}
          schema={schema}
          onUpdate={(updatedData) => onUpdate('context', updatedData)}
          error={error ?? undefined}
        />
        <div className="text-text-soft flex items-center gap-1.5 text-[10px] font-normal leading-[13px]">
          <RiInformation2Line className="h-3 w-3 shrink-0" />
          <span>Changes here only affect the preview and won't be saved to the context.</span>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
