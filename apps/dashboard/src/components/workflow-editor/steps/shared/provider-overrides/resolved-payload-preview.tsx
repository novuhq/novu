import type { ReactNode } from 'react';
import { RiExternalLinkLine } from 'react-icons/ri';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { cn } from '@/utils/ui';
import type { ProviderOverrideOption } from './override-options';
import {
  type OverridePreviewLine,
  type OverridePreviewLineOrigin,
  PROVIDER_OVERRIDES_DOCS_URL,
} from './override-preview';
import { getParentSource, type OverrideContentSource } from './override-source';
import { describeOverrideSource } from './override-source-description';

const ORIGIN_CHIP_CLASS: Record<OverridePreviewLineOrigin, string> = {
  default: 'bg-bg-white text-text-soft',
  provider: 'bg-bg-muted text-text-sub',
  integration: 'bg-feature-lighter text-feature',
};

/** Lines made only of brackets and commas carry no value, so they are dimmed. */
const STRUCTURAL_LINE_PATTERN = /^[\s{}[\],]*$/;

function getOriginLabel(
  origin: OverridePreviewLineOrigin,
  source: OverrideContentSource,
  providerOptions: ProviderOverrideOption[]
): string {
  switch (origin) {
    case 'default':
      return 'Default';
    case 'provider':
      return describeOverrideSource(getParentSource(source) ?? source, providerOptions).ownerLabel;
    case 'integration':
      return describeOverrideSource(source, providerOptions).ownerLabel;
    default: {
      const unhandled: never = origin;

      return unhandled;
    }
  }
}

function getOriginTooltip(origin: OverridePreviewLineOrigin, label: string): string {
  switch (origin) {
    case 'default':
      return 'Filled from your Default content because no override sets this key.';
    case 'provider':
      return `Set by the ${label} override.`;
    case 'integration':
      return `Set by the ${label} override, merged over the provider-wide one.`;
    default: {
      const unhandled: never = origin;

      return unhandled;
    }
  }
}

type ResolvedPayloadPreviewProps = {
  lines: OverridePreviewLine[];
  source: OverrideContentSource;
  providerOptions: ProviderOverrideOption[];
  /** Channel-specific explanation shown above the docs link. */
  hint?: ReactNode;
  /** Header label. Defaults to the merged payload a source sends. */
  title?: string;
};

/** The payload a content source sends, one row per JSON line, with each key's source layer marked. */
export function ResolvedPayloadPreview({
  lines,
  source,
  providerOptions,
  hint,
  title = 'Resolved payload',
}: ResolvedPayloadPreviewProps) {
  const sourceName = describeOverrideSource(source, providerOptions).qualifiedLabel;

  return (
    <div className="flex min-h-0 flex-col gap-1.5">
      <div className="border-stroke-soft flex min-h-0 flex-col overflow-hidden rounded-lg border">
        <div className="bg-bg-weak border-stroke-soft flex h-8 shrink-0 items-center justify-between gap-2 border-b pl-3 pr-2">
          <span className="text-label-xs text-text-sub">{title}</span>
          <span className="text-label-xs text-text-sub truncate">{sourceName}</span>
        </div>
        <div className="bg-bg-white min-h-0 overflow-auto p-3">
          <div className="flex min-w-max flex-col gap-1">
            {lines.map((line, index) => {
              const label = line.origin ? getOriginLabel(line.origin, source, providerOptions) : undefined;

              return (
                <div key={`${index}-${line.json}`} className="flex items-center gap-2">
                  <span
                    className={cn(
                      'text-code-xs whitespace-pre font-normal tracking-[-0.24px]',
                      STRUCTURAL_LINE_PATTERN.test(line.json) ? 'text-text-soft' : 'text-text-sub'
                    )}
                  >
                    {line.json}
                  </span>
                  <div className="h-px min-w-0 flex-1" />
                  {line.origin && label && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className={cn(
                            'text-label-2xs shrink-0 select-none rounded px-1.5 py-px',
                            ORIGIN_CHIP_CLASS[line.origin]
                          )}
                        >
                          {label}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>{getOriginTooltip(line.origin, label)}</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {hint && <div className="text-paragraph-xs text-text-soft">{hint}</div>}
      <a
        href={PROVIDER_OVERRIDES_DOCS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-paragraph-xs text-text-soft hover:text-text-sub flex w-fit items-center gap-1.5 transition-colors"
      >
        Learn more about provider integration overrides. Read docs
        <RiExternalLinkLine className="size-3 shrink-0" />
      </a>
    </div>
  );
}
