import { API_HOSTNAME } from '@/config';

export type CodeSnippet = {
  identifier: string;
  to: Record<string, unknown>;
  payload: string;
  secretKey?: string;
};

const SECRET_KEY_ENV_KEY = 'NOVU_SECRET_KEY';

const safeParsePayload = (payload: string) => {
  try {
    return JSON.parse(payload);
  } catch (e) {
    return {};
  }
};

export const createNodeJsSnippet = ({ identifier, to, payload, secretKey }: CodeSnippet) => {
  const renderedSecretKey = secretKey ? `'${secretKey}'` : `process.env['${SECRET_KEY_ENV_KEY}']`;

  return `import { Novu } from '@novu/api'; 

const novu = new Novu({ 
  secretKey: ${renderedSecretKey}
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

  return `use novu;
use novu\\Models\\Components;

// Load environment variables from .env file
require 'vendor/autoload.php';
$dotenv = Dotenv\\Dotenv::createImmutable(__DIR__);
$dotenv->load();

// Get API key from environment variable
$apiKey = ${renderedSecretKey};

$sdk = novu\\Novu::builder()
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

  return `import novu_py
from novu_py import Novu
import os

with Novu(
    api_key=${renderedSecretKey},
) as novu:
    res = novu.trigger(trigger_event_request_dto=novu_py.TriggerEventRequestDto(
        workflowId="${identifier}",
        to={
            "subscriber_id": "${(to as { subscriberId: string }).subscriberId}",
        },
        payload=${JSON.stringify(safeParsePayload(payload), null, 8)}
    ))`;
};

export const createGoSnippet = ({ identifier, to, payload, secretKey }: CodeSnippet) => {
  const renderedSecretKey = secretKey ? `"${secretKey}"` : `os.Getenv("${SECRET_KEY_ENV_KEY}")`;

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
		novugo.WithSecurity(${renderedSecretKey}),
	)

	res, err := s.Trigger(ctx, components.TriggerEventRequestDto{
		WorkflowId: "${identifier}",
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
