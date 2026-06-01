import { getMcpIconPath, MCP_ICON_DEFAULT_ID } from '@novu/shared';
import { useState } from 'react';
import { cn } from '@/utils/ui';

type McpIconProps = {
  mcpId: string | undefined | null;
  className?: string;
};

export function McpIcon({ mcpId, className }: McpIconProps) {
  const [src, setSrc] = useState(() => getMcpIconPath(mcpId || MCP_ICON_DEFAULT_ID));

  return (
    <img
      src={src}
      alt=""
      aria-hidden
      className={cn('size-5 shrink-0 object-contain', className)}
      onError={() => {
        if (src !== getMcpIconPath(MCP_ICON_DEFAULT_ID)) {
          setSrc(getMcpIconPath(MCP_ICON_DEFAULT_ID));
        }
      }}
    />
  );
}
