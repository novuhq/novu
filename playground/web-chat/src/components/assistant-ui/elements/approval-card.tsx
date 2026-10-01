"use client";

import type { ComponentProps } from "react";
import { Menu } from "@base-ui/react/menu";
import { CheckIcon, ChevronDownIcon, Loader2Icon, TerminalIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { field, floating, inkButton, paper } from "./surfaces";

export type ApprovalState = "request" | "running" | "done" | "denied";

export type AlwaysAllowOption = {
  label: string;
  onSelect: () => void;
};

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
}: Omit<
  ComponentProps<"div">,
  | "children"
  | "state"
  | "command"
  | "title"
  | "subtitle"
  | "onAllowOnce"
  | "onDeny"
> & {
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
        paper,
        "flex w-full max-w-sm flex-col gap-3.5 rounded-[20px] p-4",
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-3">
        <span className="bg-foreground/[0.05] text-foreground/45 flex size-9 shrink-0 items-center justify-center rounded-xl">
          <TerminalIcon className="size-4" />
        </span>
        <div className="flex min-w-0 flex-col">
          <p className="truncate text-[13.5px] font-medium">{title}</p>
          <p className="text-foreground/45 text-xs">{subtitle}</p>
        </div>
      </div>

      <div
        className={cn(
          field,
          "text-foreground/70 rounded-xl px-3.5 py-2.5 font-mono text-xs whitespace-pre-wrap",
        )}
      >
        {command}
      </div>

      <div className="flex min-h-8 items-center justify-between gap-2">
        {state === "request" ? (
          <>
            <button
              type="button"
              onClick={onDeny}
              className="text-foreground/55 hover:bg-foreground/[0.06] hover:text-foreground/90 h-8 shrink-0 rounded-full px-3.5 text-xs font-medium whitespace-nowrap transition-[background-color,color,scale] duration-150 active:scale-[0.96]"
            >
              Deny
            </button>
            <div className="flex min-w-0 shrink-0 items-center gap-1.5">
              {alwaysAllowOptions.length === 1 ? (
                <button
                  type="button"
                  onClick={alwaysAllowOptions[0].onSelect}
                  className="text-foreground/55 hover:bg-foreground/[0.06] hover:text-foreground/90 h-8 shrink-0 rounded-full px-3.5 text-xs font-medium whitespace-nowrap transition-[background-color,color,scale] duration-150 active:scale-[0.96]"
                >
                  {alwaysAllowOptions[0].label}
                </button>
              ) : alwaysAllowOptions.length > 1 ? (
                <AlwaysAllowMenu options={alwaysAllowOptions} />
              ) : null}
              <button
                type="button"
                data-slot="button"
                onClick={onAllowOnce}
                className={cn(
                  inkButton,
                  "flex h-8 shrink-0 items-center justify-center rounded-full px-3.5 text-xs font-medium whitespace-nowrap",
                )}
              >
                Allow once
              </button>
            </div>
          </>
        ) : (
          <div
            key={state}
            className="fade-in animate-in text-foreground/55 ml-auto flex items-center gap-2 text-xs duration-300"
          >
            {state === "running" ? (
              <>
                <Loader2Icon className="text-foreground/45 size-3.5 animate-spin" />
                Approved, running
              </>
            ) : state === "denied" ? (
              <>
                <XIcon className="text-foreground/45 size-3.5" />
                Denied
              </>
            ) : (
              <>
                <CheckIcon className="size-3.5 text-emerald-500" />
                Approved
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AlwaysAllowMenu({ options }: { options: AlwaysAllowOption[] }) {
  return (
    <Menu.Root>
      <Menu.Trigger
        className="text-foreground/55 hover:bg-foreground/[0.06] hover:text-foreground/90 inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-3.5 text-xs font-medium whitespace-nowrap transition-[background-color,color,scale] duration-150 active:scale-[0.96]"
      >
        Always allow
        <ChevronDownIcon className="size-3.5 opacity-70" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="top" align="end" sideOffset={6} className="z-50">
          <Menu.Popup
            className={cn(
              floating,
              "min-w-48 origin-(--transform-origin) rounded-xl p-1 shadow-md outline-none",
            )}
          >
            {options.map((option) => (
              <Menu.Item
                key={option.label}
                onClick={option.onSelect}
                className="text-foreground/80 hover:bg-foreground/[0.06] data-highlighted:bg-foreground/[0.06] flex cursor-pointer items-center rounded-lg px-3 py-2 text-xs font-medium outline-none select-none"
              >
                {option.label}
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
