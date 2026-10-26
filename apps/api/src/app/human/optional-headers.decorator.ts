import { applyDecorators } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';
import { NOVU_ANALYTICS_SOURCE_HEADER } from '@novu/shared';

import { AGENT_INBOX_HOST_HEADER, AGENT_INBOX_VIA_HEADER } from './services/human-host-status.service';

const OPTIONAL_HEADERS = {
  [AGENT_INBOX_VIA_HEADER]: 'Which way a host came in: `cli` or `mcp`. Absent for the dashboard.',
  [AGENT_INBOX_HOST_HEADER]: 'Which host sent the call, such as `claude-code`. Absent when the caller is not a host.',
  [NOVU_ANALYTICS_SOURCE_HEADER]: 'Where the call came from: `cli`, `mcp`, or `dashboard`.',
} as const;

type OptionalHeaderName = keyof typeof OPTIONAL_HEADERS;

/** Documents a request header the handler accepts and does not require. */
export function OptionalHeaders(...names: OptionalHeaderName[]) {
  return applyDecorators(
    ...names.map((name) => ApiHeader({ name, required: false, description: OPTIONAL_HEADERS[name] }))
  );
}
