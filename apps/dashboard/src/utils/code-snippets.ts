import { API_HOSTNAME, IS_EU, IS_SELF_HOSTED } from '@/config';
import { apiHostnameManager } from '@/utils/api-hostname-manager';

export type CodeSnippet = {
  identifier: string;
  to: Record<string, unknown>;
  payload: string;
  secretKey?: string;
};

export type TriggerCurlCommandOptions = {
  workflowId: string;
  to: unknown;
  payload: string | Record<string, unknown>;
  apiKey: string;
  baseUrl?: string;
  addDashboardSource?: boolean;
  context?: Record<string, unknown>;
};

const SECRET_KEY_ENV_KEY = 'NOVU_SECRET_KEY';

const safeParsePayload = (payload: string) => {
  try {
    return JSON.parse(payload);
  } catch {
    return {};
  }
};

export const createNodeJsSnippet = ({ identifier, to, payload, secretKey }: CodeSnippet) => {
  const renderedSecretKey = secretKey ? `'${secretKey}'` : `process.env.${SECRET_KEY_ENV_KEY}`;
  let serverConfig = '';

  if (IS_EU) {
    serverConfig = `,\n  serverIdx: 1`;
  } else if (IS_SELF_HOSTED) {
    serverConfig = `,\n  serverURL: '${API_HOSTNAME}'`;
  }

  return `import { Novu } from '@novu/api'; 

const novu = new Novu({ 
  secretKey: ${renderedSecretKey}${serverConfig}
});

novu.trigger(${JSON.stringify(
    {
      workflowId: identifier,
      to,
      payload: safeParsePayload(payload),
    },
    null,
    2
  )
    .replace(/"([^"]+)":/g, '$1:')
    .replace(/"/g, "'")});
`;
};

export const createCurlSnippet = ({ identifier, to, payload, secretKey = SECRET_KEY_ENV_KEY }: CodeSnippet) => {
  return `curl -X POST '${API_HOSTNAME}/v1/events/trigger' \\
  -H 'Authorization: ApiKey ${secretKey}' \\
  -H 'Content-Type: application/json' \\
  -d '${JSON.stringify(
    {
      name: identifier,
      to,
      payload: safeParsePayload(payload),
    },
    null,
    2
  )}'`;
};

export const createTriggerRequestBody = ({
  workflowId,
  to,
  payload,
  addDashboardSource = true,
  context,
}: Omit<TriggerCurlCommandOptions, 'apiKey' | 'baseUrl'>) => {
  let parsedPayload = {};

  try {
    parsedPayload = typeof payload === 'string' ? JSON.parse(payload) : payload;
  } catch {
    parsedPayload = {};
  }

  return {
    name: workflowId,
    to,
    payload: addDashboardSource ? { ...parsedPayload, __source: 'dashboard' } : parsedPayload,
    context,
  };
};

export const generateTriggerCurlCommand = ({
  workflowId,
  to,
  payload,
  apiKey,
  context,
  baseUrl = apiHostnameManager.getHostname(),
  addDashboardSource = true,
}: TriggerCurlCommandOptions) => {
  const body = createTriggerRequestBody({ workflowId, to, payload, addDashboardSource, context });

  return `curl -X POST "${baseUrl}/v1/events/trigger" \\
  -H "Authorization: ApiKey ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(body, null, 2)}'`;
};

export type PostmanCollectionOptions = {
  workflowId: string;
  to: unknown;
  payload: string | Record<string, unknown>;
  apiKey: string;
  baseUrl?: string;
  addDashboardSource?: boolean;
  context?: Record<string, unknown>;
};

export const generatePostmanCollection = ({
  workflowId,
  to,
  payload,
  apiKey,
  baseUrl = apiHostnameManager.getHostname(),
  addDashboardSource = true,
  context,
}: PostmanCollectionOptions) => {
  const body = createTriggerRequestBody({ workflowId, to, payload, addDashboardSource, context });

  return {
    info: {
      name: `Novu - Trigger ${workflowId}`,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: [
      {
        name: `Trigger ${workflowId}`,
        request: {
          method: 'POST',
          header: [
            {
              key: 'Authorization',
              value: `ApiKey ${apiKey}`,
            },
            {
              key: 'Content-Type',
              value: 'application/json',
            },
          ],
          body: {
            mode: 'raw',
            raw: JSON.stringify(body, null, 2),
            options: {
              raw: {
                language: 'json',
              },
            },
          },
          url: `${baseUrl}/v1/events/trigger`,
        },
      },
    ],
  };
};

export const createFrameworkSnippet = ({ identifier, to, payload }: CodeSnippet) => {
  return `import { Novu } from '@novu/api';

const novu = new Novu({ 
  secretKey: process.env.${SECRET_KEY_ENV_KEY}
});

// Trigger your workflow
novu.trigger(${JSON.stringify(
    {
      workflowId: identifier,
      to,
      payload: safeParsePayload(payload),
    },
    null,
    2
  )
    .replace(/"([^"]+)":/g, '$1:')
    .replace(/"/g, "'")});
`;
};

const transformJsonToPhpArray = (data: Record<string, unknown>, indentLevel = 4): string => {
  indentLevel = Math.max(0, indentLevel);

  if (Object.keys(data).length === 0) {
    return '[]';
  }

  const entries = Object.entries(data);
  const indent = ' '.repeat(indentLevel);
  const baseIndent = ' '.repeat(Math.max(0, indentLevel - 4));

  const items = entries
    .map(([key, value]) => {
      const formattedValue = JSON.stringify(value).replace(/"/g, "'");
      return `${indent}'${key}' => ${formattedValue}`;
    })
    .join(',\n');

  return `[\n${items}\n${baseIndent}]`;
};

export const createPhpSnippet = ({ identifier, to, payload, secretKey }: CodeSnippet) => {
  const renderedSecretKey = secretKey
    ? `'${secretKey}'`
    : `$_ENV['${SECRET_KEY_ENV_KEY}'] ?? getenv('${SECRET_KEY_ENV_KEY}')`;
  let serverConfig = '';

  if (IS_EU) {
    serverConfig = `
    ->setServerIndex(1)`;
  } else if (IS_SELF_HOSTED) {
    serverConfig = `
    ->setServerURL('${API_HOSTNAME}')`;
  }

  const subscriberId = typeof to === 'string' ? to : (to as Record<string, unknown>).subscriberId || 'subscriber-id';

  return `<?php
declare(strict_types=1);

require 'vendor/autoload.php';

use novu;
use novu\\Models\\Components;

$sdk = novu\\Novu::builder()${serverConfig}
    ->setSecurity(${renderedSecretKey})
    ->build();

$request = new Components\\TriggerEventRequestDto(
    workflowId: '${identifier}',
    to: '${subscriberId}',
    payload: ${transformJsonToPhpArray(safeParsePayload(payload), 8)}
);

$response = $sdk->trigger(triggerEventRequestDto: $request);`;
};

export const createPythonSnippet = ({ identifier, to, payload, secretKey }: CodeSnippet) => {
  const renderedSecretKey = secretKey ? `"${secretKey}"` : `os.getenv("${SECRET_KEY_ENV_KEY}")`;
  const needsOsImport = !secretKey;
  let serverConfig = '';

  if (IS_EU) {
    serverConfig = `,\n    server_idx=1`;
  } else if (IS_SELF_HOSTED) {
    serverConfig = `,\n    server_url="${API_HOSTNAME}"`;
  }

  const subscriberId = typeof to === 'string' ? to : (to as Record<string, unknown>).subscriberId || 'subscriber-id';

  // Format payload with proper Python indentation
  const formattedPayload = JSON.stringify(safeParsePayload(payload), null, 4)
    .split('\n')
    .map((line, index) => (index === 0 ? line : `        ${line}`))
    .join('\n');

  const osImport = needsOsImport ? 'import os\n' : '';

  return `${osImport}import novu_py
from novu_py import Novu

with Novu(
    secret_key=${renderedSecretKey}${serverConfig},
) as novu:
    res = novu.trigger(trigger_event_request_dto=novu_py.TriggerEventRequestDto(
        workflow_id="${identifier}",
        to="${subscriberId}",
        payload=${formattedPayload},
    ))`;
};

const convertJsonToGoMap = (data: Record<string, unknown>, indentLevel = 2): string => {
  if (Object.keys(data).length === 0) {
    return 'map[string]any{}';
  }

  const indent = '\t'.repeat(indentLevel);
  const baseIndent = '\t'.repeat(indentLevel - 1);

  const entries = Object.entries(data)
    .map(([key, value]) => {
      let formattedValue: string;
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        formattedValue = convertJsonToGoMap(value as Record<string, unknown>, indentLevel + 1);
      } else if (typeof value === 'string') {
        formattedValue = `"${value}"`;
      } else {
        formattedValue = JSON.stringify(value);
      }
      return `${indent}"${key}": ${formattedValue}`;
    })
    .join(',\n');

  return `map[string]any{\n${entries},\n${baseIndent}}`;
};

export const createGoSnippet = ({ identifier, to, payload, secretKey }: CodeSnippet) => {
  const renderedSecretKey = secretKey ? `"${secretKey}"` : `os.Getenv("${SECRET_KEY_ENV_KEY}")`;
  const needsOsImport = !secretKey;
  let serverConfig = '';

  if (IS_EU) {
    serverConfig = `\n		novugo.WithServerIndex(1),`;
  } else if (IS_SELF_HOSTED) {
    serverConfig = `\n		novugo.WithServerURL("${API_HOSTNAME}"),`;
  }

  const subscriberId = typeof to === 'string' ? to : (to as Record<string, unknown>).subscriberId || 'subscriber-id';

  const formattedPayload = convertJsonToGoMap(safeParsePayload(payload), 2);
  const osImport = needsOsImport ? '\n	"os"' : '';

  return `package main

import (
	"context"
	novugo "github.com/novuhq/novu-go"
	"github.com/novuhq/novu-go/models/components"
	"log"${osImport}
)

func main() {
	ctx := context.Background()

	s := novugo.New(
		novugo.WithSecurity(${renderedSecretKey}),${serverConfig}
	)

	res, err := s.Trigger(ctx, components.TriggerEventRequestDto{
		WorkflowID: "${identifier}",
		Payload: ${formattedPayload},
		To: components.CreateToStr(
			"${subscriberId}",
		),
	}, nil)
	if err != nil {
		log.Fatal(err)
	}
	if res.TriggerEventResponseDto != nil {
		// handle response
	}
}`;
};
