import { useMemo } from 'react';
import { type AgentTemplate } from '@/components/agents/create-agent-fields';
import { getMcpIcon } from '@/components/icons/mcp';
import { OrbIcon } from '@/components/icons/orb';
import { cn } from '@/utils/ui';

const VISIBLE_INTEGRATION_ICONS = 2;

type AgentSuggestionPillsProps = {
  suggestions: AgentTemplate[];
  onSelect: (suggestion: AgentTemplate) => void;
  disabled?: boolean;
  className?: string;
};

export function AgentSuggestionPills({ suggestions, onSelect, disabled, className }: AgentSuggestionPillsProps) {
  if (!suggestions.length) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {suggestions.map((suggestion) => (
        <SuggestionPill key={suggestion.label} suggestion={suggestion} disabled={disabled} onSelect={onSelect} />
      ))}
    </div>
  );
}

type SuggestionPillProps = {
  suggestion: AgentTemplate;
  disabled?: boolean;
  onSelect: (suggestion: AgentTemplate) => void;
};

function SuggestionPill({ suggestion, disabled, onSelect }: SuggestionPillProps) {
  const { visibleIcons, overflowCount } = useMemo(() => {
    const visible = suggestion.suggestedMcpServers.slice(0, VISIBLE_INTEGRATION_ICONS);
    const overflow = Math.max(0, suggestion.suggestedMcpServers.length - VISIBLE_INTEGRATION_ICONS);

    return { visibleIcons: visible, overflowCount: overflow };
  }, [suggestion.suggestedMcpServers]);

  return (
    <button
      type="button"
      onClick={() => onSelect(suggestion)}
      disabled={disabled}
      className={cn(
        'bg-bg-white border-stroke-soft hover:bg-bg-weak inline-flex items-center gap-2 rounded-full border px-1.5 py-1 transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50'
      )}
    >
      <span className="inline-flex items-center gap-1">
        <OrbIcon className="text-feature size-4 shrink-0 opacity-70" aria-hidden />
        <span className="text-text-sub text-label-xs font-medium leading-4">{suggestion.label}</span>
      </span>
      {(visibleIcons.length > 0 || overflowCount > 0) && (
        <span className="inline-flex items-center gap-0.5">
          {visibleIcons.map((id) => {
            const Icon = getMcpIcon(id);
            if (!Icon) return null;

            return (
              <span
                key={id}
                className="border-stroke-soft-100 inline-flex size-[18px] items-center justify-center rounded-[4px] border bg-[#fbfbfb]"
              >
                <Icon className="size-[14px]" />
              </span>
            );
          })}
          {overflowCount > 0 && (
            <span className="border-stroke-soft-100 text-text-soft inline-flex size-[18px] items-center justify-center rounded-[4px] border bg-[#fbfbfb] text-[10px] font-medium leading-[14px]">
              +{overflowCount}
            </span>
          )}
        </span>
      )}
    </button>
  );
}
