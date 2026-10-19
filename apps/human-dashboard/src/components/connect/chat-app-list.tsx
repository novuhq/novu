'use client';

import { ChevronRight } from 'lucide-react';

import { ToolIcon } from '@/components/connect/connect-tool-drawer';
import { Badge } from '@/components/ui/badge';
import { AI_TOOLS, type AiTool, type ToolId } from '@/lib/ai-tools';

type ChatAppListProps = {
  /** The chat apps that have signed in to the account. */
  connectedTools: ToolId[];
  /** The hosted MCP server the apps connect to, or `null` while there is none: the rows then open the docs. */
  mcpUrl: string | null;
  docsUrl: string;
  /** Opens the app's connect drawer. */
  onOpen: (tool: AiTool) => void;
};

const ROW =
  'relative flex w-full cursor-pointer items-center gap-3 px-3.5 py-3 text-left transition-colors duration-150 hover:bg-raised focus-visible:-outline-offset-2 motion-reduce:transition-none';

/** CHAT APPS: ChatGPT, Claude and Cursor, which act as a host through the MCP server. One row each. */
export function ChatAppList({ connectedTools, mcpUrl, docsUrl, onOpen }: ChatAppListProps) {
  return (
    <ul className="overflow-hidden rounded-[10px] border border-border">
      {AI_TOOLS.map((tool) => {
        const row = (
          <>
            <ToolIcon tool={tool} className="size-6 rounded-[5.25px]" />
            <span className="flex min-w-0 flex-1 flex-col gap-px">
              <span className="truncate text-[13px] leading-4.5 font-medium text-foreground">{tool.name}</span>
              <span className="truncate text-xs leading-4 text-secondary">{tool.label}</span>
            </span>
            {connectedTools.includes(tool.id) ? (
              <Badge variant="success">Connected</Badge>
            ) : (
              <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 text-muted" />
            )}
          </>
        );

        return (
          <li key={tool.id} className="border-b border-border last:border-b-0">
            {mcpUrl === null ? (
              <a href={docsUrl} target="_blank" rel="noreferrer" className={ROW}>
                {row}
                <span className="sr-only">(opens the docs in a new tab)</span>
              </a>
            ) : (
              <button type="button" aria-haspopup="dialog" onClick={() => onOpen(tool)} className={ROW}>
                {row}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
