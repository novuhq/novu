import { Box } from '@mantine/core';
import { Prism } from '@mantine/prism';
import { IconOutlineBolt } from '@novu/novui/icons';
import { Tabs, Title } from '@novu/novui';
import { HStack } from '@novu/novui/jsx';
import { FC } from 'react';
import { Language } from 'prism-react-renderer';
import {
  createNodeSnippet,
  createCurlSnippet,
  createPhpSnippet,
  createGoSnippet,
  createPythonSnippet,
  CodeSnippetProps,
} from '../../../../utils/codeSnippets';

type Snippet = {
  languageLabel: string;
  language: Language;
  create: (props: CodeSnippetProps) => string;
};

const snippets: Snippet[] = [
  {
    languageLabel: 'Node.js',
    language: 'javascript',
    create: createNodeSnippet,
  },
  {
    languageLabel: 'Curl',
    language: 'bash',
    create: createCurlSnippet,
  },
  {
    languageLabel: 'PHP',
    language: 'c', // PHP is not supported
    create: createPhpSnippet,
  },
  {
    languageLabel: 'Golang',
    language: 'go',
    create: createGoSnippet,
  },
  {
    languageLabel: 'Python',
    language: 'python',
    create: createPythonSnippet,
  },
];

const DEFAULT_LANGUAGE: Language = 'javascript';

export const WorkflowTestTriggerPanel: FC<CodeSnippetProps> = (props) => {
  return (
    <Box>
      <HStack gap="50" mb="margins.layout.page.section.titleBottom">
        <IconOutlineBolt />
        <Title variant="subsection">Trigger code</Title>
      </HStack>
      <Tabs
        height={'[100% !important]'}
        defaultValue={DEFAULT_LANGUAGE}
        tabConfigs={snippets.map((snippet) => ({
          value: snippet.language,
          label: snippet.languageLabel,
          content: (
            <Prism withLineNumbers={true} language={snippet.language} h="100%">
              {snippet.create(props)}
            </Prism>
          ),
        }))}
      />
    </Box>
  );
};
