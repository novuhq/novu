import { getMcpIconPath, MCP_ICON_DEFAULT_ID } from '@novu/shared';
import { useMemo, useState } from 'react';
import { cn } from '@/utils/ui';

type McpIconProps = {
  mcpId: string | undefined | null;
  fallbackUrl?: string;
  className?: string;
};

export function McpIcon({ mcpId, fallbackUrl, className }: McpIconProps) {
  const sources = useMemo(() => {
    const defaultSrc = getMcpIconPath(MCP_ICON_DEFAULT_ID);
    const candidates = [getMcpIconPath(mcpId || MCP_ICON_DEFAULT_ID), fallbackUrl, defaultSrc].filter(
      (value): value is string => Boolean(value)
    );

    return Array.from(new Set(candidates));
  }, [mcpId, fallbackUrl]);

  const sourcesKey = sources.join('|');
  const [index, setIndex] = useState(0);
  const [trackedKey, setTrackedKey] = useState(sourcesKey);
  const safeIndex = index < sources.length ? index : 0;

  if (trackedKey !== sourcesKey) {
    setTrackedKey(sourcesKey);
    setIndex(0);
  }

  return (
    <img
      src={sources[safeIndex]}
      alt=""
      aria-hidden
      className={cn('size-5 shrink-0 object-contain', className)}
      onError={() => {
        setIndex((current) => (current < sources.length - 1 ? current + 1 : current));
      }}
    />
  );
}
