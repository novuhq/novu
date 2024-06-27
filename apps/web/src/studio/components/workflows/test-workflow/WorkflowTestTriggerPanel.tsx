import { Box } from '@mantine/core';
import { Prism } from '@mantine/prism';
import { IconOutlineBolt } from '@novu/novui/icons';
import { Tabs, Title } from '@novu/novui';
import { HStack } from '@novu/novui/jsx';
import { FC } from 'react';
import {
  createNodeSnippet,
  createCurlSnippet,
  createPhpSnippet,
  createGoSnippet,
  createPythonSnippet,
} from '../../../../utils/codeSnippets';

interface IWorkflowTestTriggerPanelProps {
  identifier: string;
  to: Record<string, unknown>;
  payload: Record<string, unknown>;
  apiKey: string;
}

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
