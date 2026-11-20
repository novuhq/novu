"use client";

import type { ComponentProps } from "react";
import { CheckIcon, CloudOffIcon, Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { mono, paper } from "./surfaces";

export type ConnectionPhase = "online" | "dropped" | "reconnecting" | "resumed";

export function ConnectionState({
  phase,
  attempt,
  resumedTokens,
  onRetry,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  "children" | "phase" | "attempt" | "resumedTokens" | "onRetry"
> & {
  phase: ConnectionPhase;
  attempt?: number;
  resumedTokens?: number;
  onRetry?: () => void;
}) {
  if (phase === "online") return null;

  return (
    <div
      data-slot="connection-state"
      className={cn(
        paper,
        "fade-in slide-in-from-top-1 animate-in flex w-full max-w-sm items-center gap-2.5 rounded-2xl px-3.5 py-2.5 duration-300",
        className,
      )}

      {...props}
    >
      {phase === "dropped" && (
        <>
          <CloudOffIcon className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="min-w-0 flex-1 text-[13px]">
            Connection lost. The run kept going on the server.
          </span>
          <button
            type="button"
            onClick={onRetry}
            className="text-foreground/70 hover:bg-foreground/[0.06] hover:text-foreground/95 shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-[background-color,color,scale] duration-150 active:scale-[0.96]"
          >
            Reconnect
          </button>
        </>
      )}

      {phase === "reconnecting" && (
        <>
          <Loader2Icon className="text-foreground/40 size-3.5 shrink-0 animate-spin motion-reduce:animate-none" />
          <span className="min-w-0 flex-1 text-[13px]">Reconnecting</span>
          {attempt !== undefined && (
            <span
              className={cn(mono, "text-foreground/30 shrink-0 tabular-nums")}
            >
              attempt {attempt}
            </span>
          )}
        </>
      )}

      {phase === "resumed" && (
        <>
          <CheckIcon className="size-3.5 shrink-0 text-emerald-500" />
          <span className="min-w-0 flex-1 text-[13px]">
            Picked the stream back up.
          </span>
          {resumedTokens !== undefined && (
            <span
              className={cn(mono, "text-foreground/30 shrink-0 tabular-nums")}
            >
              +{resumedTokens} tokens
            </span>
          )}
        </>
      )}
    </div>
  );
}
