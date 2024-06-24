import { API_ROOT } from '../config/index';

export const createNodeSnippet = (
  identifier: string,
  to: Record<string, unknown>,
  payload: Record<string, unknown>,
  overrides?: Record<string, unknown>,
  snippet?: Record<string, unknown>,
  apiKey = '<API_KEY>'
) => {
  return `import { Novu } from '@novu/node'; 

const novu = new Novu('${apiKey}');

novu.trigger('${identifier}', ${JSON.stringify(
    {
      to,
      payload,
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

export const createCurlSnippet = (
  identifier: string,
  to: Record<string, unknown>,
  payload: Record<string, unknown>,
  overrides?: Record<string, unknown>,
  snippet?: Record<string, unknown>,
  apiKey = '<API_KEY>'
) => {
  return `curl --location --request POST '${API_ROOT}/v1/events/trigger' \\
--header 'Authorization: ApiKey ${apiKey}' \\
--header 'Content-Type: application/json' \\
--data-raw '${JSON.stringify(
    {
      name: identifier,
      to,
      payload,
      overrides,
      ...snippet,
    },
    null,
    2
  )}'
  `;
};

export const createPhpSnippet = (
  identifier: string,
  to: Record<string, any>,
  payload: Record<string, any>,
  apiKey = '<API_KEY>'
) => {
  return `use Novu\\SDK\\Novu;

$novu = new Novu('${apiKey}');

$response = $novu->triggerEvent([
    'name' => '${identifier}',
    'payload' => [
${Object.keys(payload)
  .map((key) => {
    return `        '${key}' => '${payload[key]}',`;
  })
  .join('\n')}
    ],
    'to' => [
${Object.keys(to)
  .map((key) => {
    return `        '${key}' => '${to[key]}',`;
  })
  .join('\n')}
    ]
])->toArray();`;
};

export const createPythonSnippet = (
  identifier: string,
  to: Record<string, any>,
  payload: Record<string, any>,
  apiKey = '<API_KEY>'
) => {
  return `from novu.api import EventApi

url = "https://api.novu.co"

novu = EventApi(url, "${apiKey}").trigger(
    name="${identifier}",
    recipients="${to.subscriberId}",
    payload={
${Object.keys(payload)
  .map((key) => {
    return `        "${key}":"${payload[key]}",`;
  })
  .join('\n')}
    },
)`;
};

export const createGoSnippet = (
  identifier: string,
  to: Record<string, any>,
  payload: Record<string, any>,
  apiKey = '<API_KEY>'
) => {
  return `package main

import (
	"context"
	"fmt"
	novu "github.com/novuhq/go-novu/lib"
	"log"
)

func main() {
	ctx := context.Background()
	to := map[string]interface{}{
${Object.keys(payload)
  .map((key) => {
    return `		"${key}": "${payload[key]}",`;
  })
  .join('\n')}
	}

	payload := map[string]interface{}{
${Object.keys(to)
  .map((key) => {
    return `		"${key}": "${to[key]}",`;
  })
  .join('\n')}
	}

	data := novu.ITriggerPayloadOptions{To: to, Payload: payload}
	novuClient := novu.NewAPIClient("${apiKey}", &novu.Config{})

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
