import { API_HOSTNAME, IS_EU, IS_SELF_HOSTED } from '@/config';

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
  const renderedSecretKey = secretKey ? `'${secretKey}'` : `process.env['${SECRET_KEY_ENV_KEY}']`;
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
  )}'
  `;
};

export const createTriggerRequestBody = ({
  workflowId,
  to,
  payload,
  addDashboardSource = true,
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
  };
};

export const generateTriggerCurlCommand = ({
  workflowId,
  to,
  payload,
  apiKey,
  baseUrl = API_HOSTNAME ?? 'https://api.novu.co',
  addDashboardSource = true,
}: TriggerCurlCommandOptions) => {
  const body = createTriggerRequestBody({ workflowId, to, payload, addDashboardSource });

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
};

export const generatePostmanCollection = ({
  workflowId,
  to,
  payload,
  apiKey,
  baseUrl = API_HOSTNAME ?? 'https://api.novu.co',
  addDashboardSource = true,
}: PostmanCollectionOptions) => {
  const body = createTriggerRequestBody({ workflowId, to, payload, addDashboardSource });

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
  return `import { workflow } from '@novu/framework';

const commentWorkflow = workflow('${identifier}', async (event) => {
  const inAppResponse = await event.step.inApp('notify-user', async () => ({
    body: renderReactComponent(event.payload.postId)
  }));
  
  const { events } = await event.step.digest('1 week');
  
  await event.step.email('weekly-comments', async (inputs) => {
    return {
      subject: \`Weekly post comments (\${events.length + 1})\`,
      body: renderReactEmail(inputs, events)
    };
  }, { skip: () => inAppResponse.seen });
}, { payloadSchema: z.object({ postId: z.string() }) }
);

// Use the same familiar syntax to send a notification
commentWorkflow.trigger(${JSON.stringify(
    {
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

const transformJsonToPhpArray = (data: Record<string, unknown>, indentLevel = 4) => {
  const entries = Object.entries(data);
  const indent = ' '.repeat(indentLevel);

  const obj = entries
    .map(([key, value]) => {
      return `
${indent}'${key}' => ${JSON.stringify(value)},`;
    })
    .join('')
    .replace(/"/g, "'");

  return `${obj}${Object.keys(data).length > 0 ? `\n${new Array(indentLevel - 4).fill(' ').join('')}` : ''}`;
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

  return `use novu;
use novu\\Models\\Components;

// Load environment variables from .env file
require 'vendor/autoload.php';
$dotenv = Dotenv\\Dotenv::createImmutable(__DIR__);
$dotenv->load();

// Get API key from environment variable
$apiKey = ${renderedSecretKey};

$sdk = novu\\Novu::builder()${serverConfig}
    ->setSecurity($apiKey)
    ->build();

$request = new Components\\TriggerEventRequestDto(
    workflowId: '${identifier}',
    to: new Components\\SubscriberPayloadDto(
        subscriberId: '${(to as { subscriberId: string }).subscriberId}',
    ),
    payload: [${transformJsonToPhpArray(safeParsePayload(payload), 8)}]
);

$response = $sdk->events->trigger($request);`;
};

export const createPythonSnippet = ({ identifier, to, payload, secretKey }: CodeSnippet) => {
  const renderedSecretKey = secretKey ? `'${secretKey}'` : `os.environ['${SECRET_KEY_ENV_KEY}']`;
  let serverConfig = '';

  if (IS_EU) {
    serverConfig = `,\n    server_idx=1`;
  } else if (IS_SELF_HOSTED) {
    serverConfig = `,\n    server_url='${API_HOSTNAME}'`;
  }

  return `import novu_py
from novu_py import Novu
import os

with Novu(
    secret_key=${renderedSecretKey}${serverConfig}
) as novu:

    res = novu.trigger(trigger_event_request_dto=novu_py.TriggerEventRequestDto(
        workflow_id="${identifier}",
        to="${(to as { subscriberId: string }).subscriberId}",
        payload={
            ${JSON.stringify(safeParsePayload(payload), null, 12).slice(1, -1).trim()}
        }
    ))`;
};

export const createGoSnippet = ({ identifier, to, payload, secretKey }: CodeSnippet) => {
  const renderedSecretKey = secretKey ? `"${secretKey}"` : `os.Getenv("${SECRET_KEY_ENV_KEY}")`;
  let serverConfig = '';

  if (IS_EU) {
    serverConfig = `\n		novugo.WithServerIndex(1),`;
  } else if (IS_SELF_HOSTED) {
    serverConfig = `\n		novugo.WithServerURL("${API_HOSTNAME}"),`;
  }

  return `package main

import (
	"context"
	novugo "github.com/novuhq/novu-go"
	"github.com/novuhq/novu-go/models/components"
	"log"
	"os"
)

func main() {
	ctx := context.Background()

	s := novugo.New(
		novugo.WithSecurity(${renderedSecretKey}),${serverConfig}
	)

	res, err := s.Trigger(ctx, components.TriggerEventRequestDto{
		WorkflowID: "${identifier}",
		Payload: ${JSON.stringify(safeParsePayload(payload))},
		To: components.CreateToSubscriberPayloadDto(
			components.SubscriberPayloadDto{
				SubscriberID: "${(to as { subscriberId: string }).subscriberId}",
			},
		),
	})
	if err != nil {
		log.Fatal("novu error:", err)
	}
	log.Printf("Response: %+v\\n", res)
}`;
};
