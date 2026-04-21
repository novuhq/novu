import { useState } from 'react';
import { RiImageLine, RiPencilLine } from 'react-icons/ri';
import { ControlInput } from '@/components/workflow-editor/control-input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { cn } from '@/utils/ui';

export type CardHeaderValue = {
  title?: string;
  subtitle?: string;
  imageUrl?: string;
};

export function CardHeaderEditor({
  header,
  variables,
  isAllowedVariable,
  onUpdate,
}: {
  header: CardHeaderValue;
  variables: React.ComponentProps<typeof ControlInput>['variables'];
  isAllowedVariable: React.ComponentProps<typeof ControlInput>['isAllowedVariable'];
  onUpdate: (patch: Partial<CardHeaderValue>) => void;
}) {
  const [imageOpen, setImageOpen] = useState(false);
  const hasImage = (header.imageUrl ?? '').length > 0;
  const isStaticImage = hasImage && !(header.imageUrl ?? '').includes('{{');

  return (
    <div className="flex items-start gap-3">
      <Popover open={imageOpen} onOpenChange={setImageOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'group/avatar relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-dashed border-neutral-200 bg-white transition-colors hover:border-neutral-300',
              hasImage && 'border-solid'
            )}
            aria-label={hasImage ? 'Edit card image' : 'Add card image'}
          >
            {isStaticImage ? (
              <img
                src={header.imageUrl}
                alt=""
                className="size-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <RiImageLine className="size-4 text-text-soft" />
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition-opacity group-hover/avatar:opacity-100">
              <RiPencilLine className="size-3" />
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="flex w-72 flex-col gap-2 p-3">
          <div className="text-2xs font-medium uppercase tracking-wide text-text-soft">Card image</div>
          <ControlInput
            variables={variables}
            isAllowedVariable={isAllowedVariable}
            value={header.imageUrl ?? ''}
            onChange={(imageUrl) => onUpdate({ imageUrl })}
            placeholder="https://…"
            autoFocus
            enableTranslations
          />
        </PopoverContent>
      </Popover>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
        <ControlInput
          className="min-h-6 px-0 py-0 text-sm font-semibold leading-tight text-foreground-950 [&_.cm-editor]:bg-transparent! [&_.cm-content]:px-0! [&_.cm-content]:py-0!"
          variables={variables}
          isAllowedVariable={isAllowedVariable}
          value={header.title ?? ''}
          onChange={(title) => onUpdate({ title })}
          placeholder="Card title"
          enableTranslations
        />
        <ControlInput
          className="min-h-5 px-0 py-0 text-xs leading-snug text-foreground-600 [&_.cm-editor]:bg-transparent! [&_.cm-content]:px-0! [&_.cm-content]:py-0!"
          variables={variables}
          isAllowedVariable={isAllowedVariable}
          value={header.subtitle ?? ''}
          onChange={(subtitle) => onUpdate({ subtitle })}
          placeholder="Subtitle"
          enableTranslations
        />
      </div>
    </div>
  );
}
