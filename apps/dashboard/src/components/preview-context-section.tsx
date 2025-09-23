import { useCallback, useState } from 'react';
import { RiInformationLine, RiRefreshLine } from 'react-icons/ri';
import { type ContextResponseDto } from '@/api/contexts';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/primitives/accordion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { useFetchContexts } from '@/hooks/use-fetch-contexts';
import { cn } from '@/utils/ui';
import { Autocomplete } from './primitives/autocomplete';
import { buttonVariants } from './primitives/button';
import { ACCORDION_STYLES } from './workflow-editor/steps/constants/preview-context.constants';
import { EditableJsonViewer } from './workflow-editor/steps/shared/editable-json-viewer/editable-json-viewer';
import { ContextSectionProps } from './workflow-editor/steps/types/preview-context.types';

export function PreviewContextSection({
  error,
  context,
  onUpdate,
  onContextSelect,
  onClearPersisted,
}: ContextSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: contextsData, isLoading } = useFetchContexts({
    limit: 20,
    search: searchQuery.length >= 2 ? searchQuery : undefined,
  });
  const contexts = contextsData?.data || [];

  const displayValue = context || {};

  const handleSelectContext = useCallback(
    (selectedContext: ContextResponseDto) => {
      onContextSelect(selectedContext);
      setSearchQuery('');
    },
    [onContextSelect]
  );

  const handleContextChange = useCallback(
    (updatedData: unknown) => {
      onUpdate('context', updatedData || {});
    },
    [onUpdate]
  );

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
                    <RiInformationLine className="size-3" />
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
                <span className="text-xs leading-none">Reset context</span>
              </button>
            </div>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent className="flex flex-col gap-2">
        <Autocomplete
          value={searchQuery}
          onChange={setSearchQuery}
          items={contexts.map((context) => ({ ...context, id: `${context.type}:${context.id}` }))}
          isLoading={isLoading}
          hasSearched={searchQuery.length >= 2}
          onSelectItem={(item) => {
            const originalContext = contexts.find((c) => `${c.type}:${c.id}` === item.id);
            if (originalContext) {
              handleSelectContext(originalContext);
            }
          }}
          size="xs"
          placeholder="Search contexts by type or ID..."
          sectionTitle="Contexts"
          emptyStateTitle="No contexts found"
          emptyStateDescription="Try a different search term"
          renderItem={(item) => {
            const originalContext = contexts.find((c) => `${c.type}:${c.id}` === item.id);
            if (!originalContext) return null;

            return (
              <div className="flex flex-col items-start gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{originalContext.id}</span>
                  <span className="text-xs text-foreground-400">({originalContext.type})</span>
                </div>
                {originalContext.data && Object.keys(originalContext.data).length > 0 && (
                  <span className="text-xs text-foreground-400">{Object.keys(originalContext.data).join(', ')}</span>
                )}
              </div>
            );
          }}
        />
        <div className="flex flex-1 flex-col gap-2 overflow-auto">
          <EditableJsonViewer
            value={displayValue}
            onChange={handleContextChange}
            className={ACCORDION_STYLES.jsonViewer}
          />
          {error && <p className="text-destructive text-xs">{error}</p>}
        </div>
        <div className="text-text-soft flex items-center gap-1.5 text-[10px] font-normal leading-[13px]">
          <RiInformationLine className="h-3 w-3 flex-shrink-0" />
          <span>Changes here only affect the preview and won't be saved to the context.</span>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
