import { useMemo } from 'react';
import { type AgentTemplate, type McpServerPreview } from '@/components/agents/create-agent-fields';
import { McpIcon } from '@/components/agents/mcp-icon';
import { OrbIcon } from '@/components/icons/orb';
import { buildEdgeFadeMask, useHorizontalScrollEdges } from '@/hooks/use-horizontal-scroll-edges';
import { cn } from '@/utils/ui';

const VISIBLE_INTEGRATION_ICONS = 2;
const PILL_FADE_WIDTH_PX = 24;

type AgentSuggestionPillsProps = {
  suggestions: AgentTemplate[];
  onSelect: (suggestion: AgentTemplate) => void;
  disabled?: boolean;
  className?: string;
};

export function AgentSuggestionPills({ suggestions, onSelect, disabled, className }: AgentSuggestionPillsProps) {
  const { ref: scrollRef, canScrollLeft, canScrollRight } = useHorizontalScrollEdges<HTMLDivElement>();
  const maskImage = buildEdgeFadeMask(canScrollLeft, canScrollRight, PILL_FADE_WIDTH_PX);

  if (!suggestions.length) return null;

  return (
    <div
      ref={scrollRef}
      className={cn('nv-no-scrollbar flex min-w-0 items-center gap-2 overflow-x-auto', className)}
      style={maskImage ? { maskImage, WebkitMaskImage: maskImage } : undefined}
    >
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
    const servers: McpServerPreview[] = suggestion.mcpServers ?? suggestion.suggestedMcpServers.map((id) => ({ id }));
    const visible = servers.slice(0, VISIBLE_INTEGRATION_ICONS);
    const overflow = Math.max(0, servers.length - VISIBLE_INTEGRATION_ICONS);

    return { visibleIcons: visible, overflowCount: overflow };
  }, [suggestion.mcpServers, suggestion.suggestedMcpServers]);

  return (
    <button
      type="button"
      onClick={() => onSelect(suggestion)}
      disabled={disabled}
      className={cn(
        'bg-bg-white border-stroke-soft hover:bg-bg-weak inline-flex shrink-0 items-center gap-2 rounded-full border px-1.5 py-1 transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50'
      )}
    >
      <span className="inline-flex items-center gap-1">
        <OrbIcon className="text-feature size-4 shrink-0 opacity-70" aria-hidden />
        <span className="text-text-sub text-label-xs font-medium leading-4">{suggestion.label}</span>
      </span>
      {(visibleIcons.length > 0 || overflowCount > 0) && (
        <span className="inline-flex items-center gap-0.5">
          {visibleIcons.map((server) => (
            <span
              key={server.id}
              className="border-stroke-soft-100 inline-flex size-[18px] items-center justify-center rounded-[4px] border bg-[#fbfbfb]"
            >
              <McpIcon mcpId={server.id} className="size-[14px]" />
            </span>
          ))}
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
