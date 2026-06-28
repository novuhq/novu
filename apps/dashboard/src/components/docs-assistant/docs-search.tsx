import { useEffect, useState } from 'react';
import { RiBookOpenLine, RiLoader4Line, RiSearchLine, RiSparklingLine } from 'react-icons/ri';
import { MintlifySearchResult } from '@/api/docs-assistant';
import { useAiDrawer } from '@/components/ai-drawer';
import { docsUrl } from '@/components/header-navigation/support-drawer-constants';
import { Input } from '@/components/primitives/input';
import { useMintlifyDocsSearch } from '@/hooks/use-mintlify-docs-search';

type DocsSearchProps = {
  onOpenDocs: (url: string) => void;
  onQueryChange: (hasQuery: boolean) => void;
};

function SearchResultCard({
  result,
  onOpenDocs,
  onAskAi,
}: {
  result: MintlifySearchResult;
  onOpenDocs: (url: string) => void;
  onAskAi: (prompt: string) => void;
}) {
  const title = result.metadata?.title ?? result.path;
  const description = result.metadata?.description ?? result.content;

  return (
    <div className="bg-background border-stroke-soft flex flex-col gap-2 rounded-xl border p-2">
      <button
        type="button"
        onClick={() => onOpenDocs(docsUrl(result.path))}
        className="hover:bg-neutral-50 flex w-full flex-col gap-1 rounded-lg p-1 text-left transition-colors"
      >
        <span className="text-foreground-950 text-sm font-medium leading-5 tracking-[-0.084px]">{title}</span>
        <span className="text-foreground-400 line-clamp-2 text-xs leading-4">{description}</span>
      </button>
      <button
        type="button"
        onClick={() => onAskAi(`Tell me about ${title}`)}
        className="text-primary-base hover:text-primary-darker flex items-center gap-1 px-1 text-xs font-medium"
      >
        <RiSparklingLine className="size-3.5" />
        Ask AI about this
      </button>
    </div>
  );
}

export function DocsSearch({ onOpenDocs, onQueryChange }: DocsSearchProps) {
  const [query, setQuery] = useState('');
  const { openAiDrawer } = useAiDrawer();
  const { results, isSearching, hasQuery } = useMintlifyDocsSearch(query);

  useEffect(() => {
    onQueryChange(query.trim().length > 0);
  }, [query, onQueryChange]);

  function handleAskAi(prompt: string) {
    openAiDrawer(prompt);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="border-stroke-soft bg-background flex h-9 items-center gap-2 rounded-lg border px-2 shadow-[0px_1px_2px_0px_rgba(10,13,20,0.03)]">
        <RiSearchLine className="text-foreground-400 size-3.5 shrink-0" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Type away… we're all ears."
          className="h-auto border-0 bg-transparent p-0 text-sm font-medium shadow-none focus-visible:ring-0"
        />
        {isSearching && <RiLoader4Line className="text-foreground-400 size-3.5 shrink-0 animate-spin" />}
      </div>

      {hasQuery && results.length > 0 && (
        <div className="flex max-h-64 flex-col gap-2 overflow-auto">
          {results.map((result) => (
            <SearchResultCard
              key={result.path}
              result={result}
              onOpenDocs={onOpenDocs}
              onAskAi={handleAskAi}
            />
          ))}
        </div>
      )}

      {hasQuery && !isSearching && results.length === 0 && (
        <div className="text-foreground-400 flex items-center gap-2 px-1 text-xs">
          <RiBookOpenLine className="size-3.5" />
          No documentation matches found
        </div>
      )}
    </div>
  );
}
