import { CopyButton } from '@/components/ui/copy-button';
import { cn } from '@/lib/utils';

const COPY_LABEL = 'Copy CLI command';

/**
 * The command in the page header (`Code` in the design): the CLI's way of seeing what the page shows. At
 * least the design's 260px, and wider when the command needs it. On a phone it takes its own line.
 */
export function HeaderCommand({ command }: { command: string }) {
  return (
    <div className="flex h-9 w-full min-w-0 items-center gap-2.5 rounded-md border border-border bg-background pr-1.25 pl-3 sm:w-auto sm:min-w-65 sm:shrink-0">
      <span aria-hidden="true" className="font-mono text-[13px] leading-5 font-medium text-accent select-none">
        $
      </span>
      <code className="min-w-0 flex-1 truncate font-mono text-[13px] leading-5 text-default">{command}</code>
      <CopyButton value={command} label={COPY_LABEL} className="size-7 text-foreground" />
    </div>
  );
}

/** The quieter command bar at the bottom of the thread drawer. */
export function FooterCommand({ command, className }: { command: string; className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md border border-border-strong bg-subtle px-2.5 py-2 font-mono text-xs leading-4',
        className
      )}
    >
      <span aria-hidden="true" className="font-medium text-accent select-none">
        $
      </span>
      <code className="min-w-0 flex-1 truncate text-foreground">{command}</code>
      <CopyButton
        value={command}
        label={COPY_LABEL}
        className="-my-0.5 -mr-1 size-5 rounded-sm"
        iconClassName="size-3"
      />
    </div>
  );
}
