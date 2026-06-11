import { MCP_SERVERS } from '@novu/shared';
import type { Variants } from 'motion/react';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo } from 'react';
import { type AgentTemplate, type McpServerPreview } from '@/components/agents/create-agent-fields';
import { McpIcon } from '@/components/agents/mcp-icon';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { Broom } from '@/components/icons/broom';
import { OrbIcon } from '@/components/icons/orb';
import { buildEdgeFadeMask, useHorizontalScrollEdges } from '@/hooks/use-horizontal-scroll-edges';
import { itemVariants } from '@/utils/animation';
import { cn } from '@/utils/ui';

const VISIBLE_INTEGRATION_ICONS = 2;
const PILL_FADE_WIDTH_PX = 24;
// Matches the rendered pill height (py-1 + 18px content) so the loading shimmer and the loaded
// pills occupy the exact same vertical space — swapping states never shifts the layout.
const ROW_HEIGHT_CLASS = 'h-[26px]';

const pillsRowVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

function resolveMcpName(server: McpServerPreview): string {
  return server.name ?? MCP_SERVERS.find((entry) => entry.id === server.id)?.name ?? server.id;
}

type AgentSuggestionPillsProps = {
  suggestions: AgentTemplate[];
  onSelect: (suggestion: AgentTemplate) => void;
  disabled?: boolean;
  /** When true, render the "Personalizing suggestions" shimmer instead of the pills (loading / refreshing). */
  isLoading?: boolean;
  className?: string;
};

export function AgentSuggestionPills({
  suggestions,
  onSelect,
  disabled,
  isLoading,
  className,
}: AgentSuggestionPillsProps) {
  const { ref: scrollRef, canScrollLeft, canScrollRight } = useHorizontalScrollEdges<HTMLDivElement>();
  const maskImage = buildEdgeFadeMask(canScrollLeft, canScrollRight, PILL_FADE_WIDTH_PX);

  if (!isLoading && !suggestions.length) return null;

  return (
    <div className={cn(ROW_HEIGHT_CLASS, 'min-w-0', className)}>
      <AnimatePresence mode="wait" initial={false}>
        {isLoading ? (
          <motion.div
            key="personalizing-suggestions"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6, scale: 0.98, filter: 'blur(4px)' }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            className={cn(ROW_HEIGHT_CLASS, 'flex min-w-0 items-center gap-1')}
          >
            <Broom fill="#525866" className="text-text-sub h-3 w-3 shrink-0 animate-pulse" />
            <Shimmer className="text-label-xs">Personalizing suggestions</Shimmer>
          </motion.div>
        ) : (
          <motion.div
            key="suggestion-pills"
            ref={scrollRef}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            variants={pillsRowVariants}
            className={cn(ROW_HEIGHT_CLASS, 'nv-no-scrollbar flex min-w-0 items-center gap-2 overflow-x-auto')}
            style={maskImage ? { maskImage, WebkitMaskImage: maskImage } : undefined}
          >
            {suggestions.map((suggestion) => (
              <motion.div key={suggestion.label} variants={itemVariants} className="flex shrink-0">
                <SuggestionPill suggestion={suggestion} disabled={disabled} onSelect={onSelect} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

type SuggestionPillProps = {
  suggestion: AgentTemplate;
  disabled?: boolean;
  onSelect: (suggestion: AgentTemplate) => void;
};

function SuggestionPill({ suggestion, disabled, onSelect }: SuggestionPillProps) {
  const { visibleIcons, overflowServers } = useMemo(() => {
    const servers: McpServerPreview[] = suggestion.mcpServers ?? suggestion.suggestedMcpServers.map((id) => ({ id }));

    return {
      visibleIcons: servers.slice(0, VISIBLE_INTEGRATION_ICONS),
      overflowServers: servers.slice(VISIBLE_INTEGRATION_ICONS),
    };
  }, [suggestion.mcpServers, suggestion.suggestedMcpServers]);

  const overflowCount = overflowServers.length;
  const overflowTitle = overflowServers.map(resolveMcpName).join(', ');

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
              title={resolveMcpName(server)}
              className="border-stroke-soft-100 inline-flex size-[18px] items-center justify-center rounded-[4px] border bg-[#fbfbfb]"
            >
              <McpIcon mcpId={server.id} fallbackUrl={server.iconUrl} className="size-[14px]" />
            </span>
          ))}
          {overflowCount > 0 && (
            <span
              title={overflowTitle}
              className="border-stroke-soft-100 text-text-soft inline-flex size-[18px] items-center justify-center rounded-[4px] border bg-[#fbfbfb] text-[10px] font-medium leading-[14px]"
            >
              +{overflowCount}
            </span>
          )}
        </span>
      )}
    </button>
  );
}
