"use client";

import { cn } from "@/lib/utils";
import { useAuiState } from "@assistant-ui/react";
import type { FC, ReactNode } from "react";

function asDate(value: Date | string | number | undefined): Date | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dayLabel(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - day.getTime()) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function timeLabel(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export const MessageChronology: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const role = useAuiState((s) => s.message.role);
  const createdAt = useAuiState((s) => s.message.createdAt);
  const index = useAuiState((s) => s.message.index);
  const prevCreatedAt = useAuiState(
    (s) => s.thread.messages[index - 1]?.createdAt,
  );

  const date = asDate(createdAt);
  const prev = asDate(prevCreatedAt);
  const showDay = date != null && (index === 0 || !prev || dayKey(date) !== dayKey(prev));

  return (
    <div data-slot="message-chronology" className="group/chrono">
      {showDay && date ? (
        <div
          data-slot="day-separator"
          className="text-muted-foreground flex items-center gap-3 py-1 text-xs font-medium"
        >
          <span className="bg-border h-px min-w-4 flex-1" />
          <span className="font-mono tracking-tight">{dayLabel(date)}</span>
          <span className="bg-border h-px min-w-4 flex-1" />
        </div>
      ) : null}
      {children}
      {date ? (
        <time
          dateTime={date.toISOString()}
          className={cn(
            "text-muted-foreground mt-1 block px-2 font-mono text-[11px] tabular-nums opacity-0 transition-opacity group-hover/chrono:opacity-100",
            role === "user" && "text-right",
          )}
        >
          {timeLabel(date)}
        </time>
      ) : null}
    </div>
  );
};
