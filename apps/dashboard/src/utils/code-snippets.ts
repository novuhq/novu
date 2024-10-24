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

  return `import { Novu } from '@novu/node'; 

const novu = new Novu(${renderedSecretKey});

novu.trigger('${identifier}', ${JSON.stringify(
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
${indent}'${key}' => '${JSON.stringify(value)}',`;
    })
    .join('');

  return `${obj}${Object.keys(data).length > 0 ? `\n${new Array(indentLevel - 4).fill(' ').join('')}` : ''}`;
};

export const createPhpSnippet = ({ identifier, to, payload, secretKey }: CodeSnippet) => {
  const renderedSecretKey = secretKey ? `'${secretKey}'` : `getenv('${SECRET_KEY_ENV_KEY}')`;

  return `use Novu\\SDK\\Novu;

$novu = new Novu(${renderedSecretKey});

$response = $novu->triggerEvent([
    'name' => '${identifier}',
    'payload' => [${transformJsonToPhpArray(safeParsePayload(payload), 8)}],
    'to' => [${transformJsonToPhpArray(to, 8)}],
])->toArray();`;
};

const transformJsonToPythonDict = (data: Record<string, unknown>, tabSpaces = 4): string => {
  const entries = Object.entries(data);
  const indent = ' '.repeat(tabSpaces);

  const obj = entries
    .map(([key, value]) => {
      return `
${indent}"${key}": ${JSON.stringify(value)},`;
    })
    .join('');

  return `${obj}${entries.length > 0 ? `\n${new Array(tabSpaces - 2).fill(' ').join('')}` : ''}`;
};

export const createPythonSnippet = ({ identifier, to, payload, secretKey }: CodeSnippet) => {
  const renderedSecretKey = secretKey ? `'${secretKey}'` : `os.environ['${SECRET_KEY_ENV_KEY}']`;

  return `from novu.api import EventApi

url = "${API_HOSTNAME}"

novu = EventApi(url, ${renderedSecretKey}).trigger(
    name="${identifier}",
    recipients={${to.subscriberId as string}},
    payload={${transformJsonToPythonDict(safeParsePayload(payload), 6)}},
)`;
};

const transformJsonToGoMap = (data: Record<string, unknown>, tabSpaces = 4): string => {
  const entries = Object.entries(data);
  const indent = ' '.repeat(tabSpaces);

  const obj = entries
    .map(([key, value]) => {
      return `
${indent}"${key}": ${JSON.stringify(value)},`;
    })
    .join('');

  return `${obj}${entries.length > 0 ? `\n${new Array(tabSpaces - 4).fill(' ').join('')}` : ''}`;
};

export const createGoSnippet = ({ identifier, to, payload, secretKey }: CodeSnippet) => {
  const renderedSecretKey = secretKey ? `"${secretKey}"` : `os.Getenv("${SECRET_KEY_ENV_KEY}")`;

  return `package main

import (
	"context"
	"fmt"
	novu "github.com/novuhq/go-novu/lib"
	"log"
)

func main() {
	ctx := context.Background()
	to := map[string]interface{}{${transformJsonToGoMap(to, 8)}}
	payload := map[string]interface{}{${transformJsonToGoMap(safeParsePayload(payload), 8)}}
	data := novu.ITriggerPayloadOptions{To: to, Payload: payload}
	novuClient := novu.NewAPIClient(${renderedSecretKey}, &novu.Config{})

	resp, err := novuClient.EventApi.Trigger(ctx, "${identifier}", data)
	if err != nil {
		log.Fatal("novu error", err.Error())
		return
	}

	fmt.Println(resp)

	// get integrations
	integrations, err := novuClient.IntegrationsApi.GetAll(ctx)
	if err != nil {
		log.Fatal("Get all integrations error: ", err.Error())
	}
	fmt.Println(integrations)
}`;
};
