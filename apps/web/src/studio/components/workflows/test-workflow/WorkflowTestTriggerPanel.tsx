import { Box } from '@mantine/core';
import { Prism } from '@mantine/prism';
import { IconOutlineBolt } from '@novu/novui/icons';
import { Tabs, Title } from '@novu/novui';
import { HStack } from '@novu/novui/jsx';
import { FC } from 'react';
import { createCurlSnippet, createNodeSnippet } from '../../../../pages/templates/components/TriggerSnippetTabs';

interface IWorkflowTestTriggerPanelProps {
  identifier: string;
  to: Record<string, unknown>;
  payload: Record<string, unknown>;
  apiKey: string;
}

const createPhpSnippet = (
  identifier: string,
  to: Record<string, any>,
  payload: Record<string, any>,
  apiKey?: string
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

const createPythonSnippet = (
  identifier: string,
  to: Record<string, any>,
  payload: Record<string, any>,
  apiKey?: string
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

const createGoSnippet = (
  identifier: string,
  to: Record<string, any>,
  payload: Record<string, any>,
  apiKey?: string
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

export const WorkflowTestTriggerPanel: FC<IWorkflowTestTriggerPanelProps> = ({ identifier, to, payload, apiKey }) => {
  return (
    <Box>
      <HStack gap="50" mb="margins.layout.page.section.titleBottom">
        <IconOutlineBolt />
        <Title variant="subsection">Trigger code</Title>
      </HStack>
      <Tabs
        height={'[100% !important]'}
        defaultValue="node"
        tabConfigs={[
          {
            value: 'node',
            label: 'Node.js',
            content: (
              <Prism withLineNumbers={true} language="javascript" h="100%">
                {createNodeSnippet(identifier, to, payload, undefined, undefined, apiKey) as any}
              </Prism>
            ),
          },
          {
            value: 'curl',
            label: 'Curl',
            content: (
              <Prism withLineNumbers={true} language="bash" h="100%">
                {createCurlSnippet(identifier, to, payload, undefined, undefined, apiKey) as any}
              </Prism>
            ),
          },
          {
            value: 'php',
            label: 'PHP',
            content: (
              <Prism withLineNumbers={true} language="markdown" h="100%">
                {createPhpSnippet(identifier, to, payload, apiKey) as any}
              </Prism>
            ),
          },
          {
            value: 'golang',
            label: 'GOlang',
            content: (
              <Prism withLineNumbers={true} language="go" h="100%">
                {createGoSnippet(identifier, to, payload, apiKey) as any}
              </Prism>
            ),
          },
          {
            value: 'python',
            label: 'Python',
            content: (
              <Prism withLineNumbers={true} language="python" h="100%">
                {createPythonSnippet(identifier, to, payload, apiKey) as any}
              </Prism>
            ),
          },
        ]}
      />
    </Box>
  );
};
