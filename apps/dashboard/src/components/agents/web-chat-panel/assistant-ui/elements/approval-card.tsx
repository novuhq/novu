import type { ComponentProps } from 'react';
import { RiCheckLine, RiCloseLine, RiLoader4Line, RiTerminalBoxLine } from 'react-icons/ri';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import { cn } from '@/utils/ui';

export type ApprovalState = 'request' | 'running' | 'done' | 'denied';

export type AlwaysAllowOption = {
  label: string;
  onSelect: () => void;
};

const ghostPill =
  'text-text-soft hover:bg-bg-weak hover:text-text-strong focus-visible:ring-stroke-soft h-8 shrink-0 rounded-full px-3.5 text-xs font-medium whitespace-nowrap transition-[background-color,color,scale] duration-150 outline-none focus-visible:ring-2 active:scale-[0.96]';

const primaryPill =
  'bg-primary-base text-static-white hover:bg-primary-darker focus-visible:ring-primary-base h-8 shrink-0 rounded-full px-3.5 text-xs font-medium whitespace-nowrap transition-[background-color,scale] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.96]';

export function ApprovalCard({
  state,
  command,
  title,
  subtitle,
  onAllowOnce,
  alwaysAllowOptions = [],
  onDeny,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'children' | 'state' | 'command' | 'title' | 'subtitle' | 'onAllowOnce' | 'onDeny'> & {
  state: ApprovalState;
  command: string;
  title: string;
  subtitle: string;
  onAllowOnce?: () => void;
  alwaysAllowOptions?: AlwaysAllowOption[];
  onDeny?: () => void;
}) {
  return (
    <div
      data-slot="approval-card"
      className={cn(
        'border-stroke-soft bg-bg-white flex w-full max-w-sm flex-col gap-3.5 rounded-[20px] border p-4',
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-3">
        <span className="bg-bg-weak text-text-soft flex size-9 shrink-0 items-center justify-center rounded-xl">
          <RiTerminalBoxLine className="size-4" />
        </span>
        <div className="flex min-w-0 flex-col">
          <p className="text-text-strong truncate text-[13.5px] font-medium">{title}</p>
          <p className="text-text-soft text-xs">{subtitle}</p>
        </div>
      </div>

      <pre className="bg-bg-weak text-text-sub rounded-xl px-3.5 py-2.5 font-mono text-xs whitespace-pre-wrap">
        {command}
      </pre>

      <div className="flex min-h-8 items-center justify-between gap-2">
        {state === 'request' ? (
          <>
            <button type="button" className={ghostPill} onClick={onDeny}>
              Deny
            </button>
            <div className="flex min-w-0 shrink-0 items-center gap-1.5">
              {alwaysAllowOptions.length === 1 ? (
                <button type="button" className={ghostPill} onClick={alwaysAllowOptions[0].onSelect}>
                  {alwaysAllowOptions[0].label}
                </button>
              ) : alwaysAllowOptions.length > 1 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className={ghostPill}>
                      Always allow
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {alwaysAllowOptions.map((option) => (
                      <DropdownMenuItem key={option.label} onSelect={option.onSelect}>
                        {option.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
              <button type="button" className={primaryPill} onClick={onAllowOnce}>
                Allow once
              </button>
            </div>
          </>
        ) : (
          <div className="text-text-soft ml-auto flex items-center gap-2 text-xs">
            {state === 'running' ? (
              <>
                <RiLoader4Line className="size-3.5 animate-spin" />
                Approved, running
              </>
            ) : state === 'denied' ? (
              <>
                <RiCloseLine className="size-3.5" />
                Denied
              </>
            ) : (
              <>
                <RiCheckLine className="text-success-base size-3.5" />
                Approved
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
