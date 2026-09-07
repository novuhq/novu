import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { type AnnotatedOverridePreview, PREVIEW_PANEL_CLASS } from './override-preview';

const DEFAULT_CONTENT_CHIP_CLASS =
  'text-label-2xs text-foreground-600 bg-neutral-alpha-100 inline-flex h-4 select-none items-center rounded-sm px-1 font-medium';

export function AnnotatedOverrideJson({
  annotatedLines,
  defaultContentKey,
}: Pick<AnnotatedOverridePreview, 'annotatedLines' | 'defaultContentKey'>) {
  return (
    <pre className={PREVIEW_PANEL_CLASS}>
      {annotatedLines.map((line, index) => (
        <div key={`${index}-${line.json}`}>
          {line.json}
          {line.isDefaultContentKey ? (
            <>
              {' '}
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className={DEFAULT_CONTENT_CHIP_CLASS}>DEFAULT CONTENT</span>
                </TooltipTrigger>
                <TooltipContent>
                  {`Filled from your Default content because the override doesn't set "${defaultContentKey}".`}
                </TooltipContent>
              </Tooltip>
            </>
          ) : null}
        </div>
      ))}
    </pre>
  );
}
