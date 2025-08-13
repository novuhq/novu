import { RiSearchLine } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { useCommandPalette } from './hooks/use-command-palette';

export function CommandTriggerButton() {
  const { openCommandPalette } = useCommandPalette();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="secondary"
          mode="outline"
          size="xs"
          onClick={openCommandPalette}
          className="gap-2 text-foreground-400 border-neutral-200 hover:border-neutral-300"
        >
          <RiSearchLine className="size-3" />
          <span className="hidden sm:inline">Search...</span>
          <kbd className="hidden sm:inline pointer-events-none h-5 select-none items-center gap-1 rounded border bg-neutral-alpha-50 px-1.5 font-mono text-xs font-medium text-foreground-400 opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Open command palette</p>
      </TooltipContent>
    </Tooltip>
  );
}
