import { Command as CommandPrimitive } from 'cmdk';
import { type RefObject, useState } from 'react';
import { RiBookMarkedLine } from 'react-icons/ri';
import { Kbd } from '@/components/primitives/kbd';
import { IS_AI_FEATURES_ENABLED } from '@/config';
import { HelpContextChip } from './help-context-chip';
import { stopCommandKeyHandling } from './help-panel-shortcut';
import { HelpDefaultView, HelpSearchView } from './help-panel-views';
import { useHelpActions } from './use-help-actions';
import { useHelpPage } from './use-help-page';

type HelpPanelProps = {
  inputRef: RefObject<HTMLInputElement | null>;
  onClose: () => void;
};

export function HelpPanel({ inputRef, onClose }: HelpPanelProps) {
  const page = useHelpPage();
  const [query, setQuery] = useState('');
  const [isContextIncluded, setIsContextIncluded] = useState(true);
  const context = isContextIncluded ? page.context : null;
  const actions = useHelpActions({ assistantContext: context?.assistantContext ?? null, onClose });
  const trimmedQuery = query.trim();

  return (
    <CommandPrimitive label="Help" shouldFilter={false} loop className="flex flex-col">
      <div className="flex flex-col border-b border-stroke-soft bg-bg-weak">
        <div className="flex items-center gap-2 pb-2 pl-3.5 pr-3 pt-3">
          <RiBookMarkedLine aria-hidden className="size-4 shrink-0 text-icon-sub" />
          <CommandPrimitive.Input
            ref={inputRef}
            value={query}
            onValueChange={setQuery}
            placeholder={IS_AI_FEATURES_ENABLED ? 'Ask the docs anything…' : 'Search the docs…'}
            className="h-5 min-w-0 flex-1 bg-transparent text-label-sm tracking-[-0.084px] text-text-strong caret-icon-disabled outline-none placeholder:text-text-soft"
          />
          <button
            type="button"
            onClick={onClose}
            onKeyDown={stopCommandKeyHandling}
            aria-label="Close help"
            className="shrink-0 rounded-6 outline-none focus-visible:ring-1 focus-visible:ring-stroke-sub"
          >
            <Kbd variant="flat">esc</Kbd>
          </button>
        </div>
        {context ? (
          <fieldset
            aria-label="Question context"
            className="flex min-w-0 items-center px-3.5 pb-2.5"
            onKeyDown={stopCommandKeyHandling}
          >
            <HelpContextChip
              icon={context.icon}
              label={context.label}
              onRemove={() => {
                setIsContextIncluded(false);
                inputRef.current?.focus();
              }}
            />
          </fieldset>
        ) : null}
      </div>
      {trimmedQuery ? (
        <HelpSearchView query={trimmedQuery} actions={actions} />
      ) : (
        <HelpDefaultView page={page} actions={actions} />
      )}
    </CommandPrimitive>
  );
}
