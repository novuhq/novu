import { API_ROOT } from '../config/index';

export type CodeSnippetProps = {
  identifier: string;
  to: Record<string, unknown>;
  payload: Record<string, unknown>;
  overrides?: Record<string, unknown>;
  snippet?: Record<string, unknown>;
  secretKey?: string;
  bridgeUrl?: string;
};

const SECRET_KEY_ENV_KEY = 'NOVU_SECRET_KEY';

const normalizePayload = (originalPayload: Record<string, unknown>) => {
  if (originalPayload?.__source) {
    // Remove internal params
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { __source, ...payload } = originalPayload;

    return payload;
  }

  return originalPayload;
};
export const createNodeSnippet = ({ identifier, to, payload, overrides, snippet, secretKey }: CodeSnippetProps) => {
  const renderedSecretKey = secretKey ? `'${secretKey}'` : `process.env['${SECRET_KEY_ENV_KEY}']`;

  return `import { Novu } from '@novu/node'; 

const novu = new Novu(${renderedSecretKey});

novu.trigger('${identifier}', ${JSON.stringify(
    {
      to,
      payload: normalizePayload(payload),
      overrides,
      ...snippet,
    },
    null,
    2
  )
    .replace(/"([^"]+)":/g, '$1:')
    .replace(/"/g, "'")});
`;
};

export const createCurlSnippet = ({
  identifier,
  to,
  payload,
  overrides,
  snippet,
  bridgeUrl,
  secretKey = SECRET_KEY_ENV_KEY,
}: CodeSnippetProps) => {
  return `curl -X POST '${API_ROOT}/v1/events/trigger' \\
-H 'Authorization: ApiKey ${secretKey}' \\
-H 'Content-Type: application/json' \\
-d '${JSON.stringify(
    {
      name: identifier,
      to,
      payload: normalizePayload(payload),
      overrides,
      bridgeUrl,
      ...snippet,
    },
    null,
    2
  )}'
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

export const createPhpSnippet = ({ identifier, to, payload, secretKey }: CodeSnippetProps) => {
  const renderedSecretKey = secretKey ? `'${secretKey}'` : `getenv('${SECRET_KEY_ENV_KEY}')`;

  return `use Novu\\SDK\\Novu;

$novu = new Novu(${renderedSecretKey});

$response = $novu->triggerEvent([
    'name' => '${identifier}',
    'payload' => [${transformJsonToPhpArray(normalizePayload(payload), 8)}],
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

export const createPythonSnippet = ({
  identifier,
  to,
  payload,
  snippet = { test: 'value' },
  secretKey,
}: CodeSnippetProps) => {
  const renderedSecretKey = secretKey ? `'${secretKey}'` : `os.environ['${SECRET_KEY_ENV_KEY}']`;

  return `from novu.api import EventApi

url = "${API_ROOT}"

novu = EventApi(url, ${renderedSecretKey}).trigger(
    name="${identifier}",
    recipients={${to.subscriberId as string}},
    payload={${transformJsonToPythonDict(normalizePayload(payload), 6)}},
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

export const createGoSnippet = ({ identifier, to, payload, snippet, secretKey }: CodeSnippetProps) => {
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
	payload := map[string]interface{}{${transformJsonToGoMap(normalizePayload(payload), 8)}}
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
