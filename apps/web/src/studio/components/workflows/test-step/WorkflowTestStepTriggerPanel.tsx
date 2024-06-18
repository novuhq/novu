import { Box } from '@mantine/core';
import { Prism } from '@mantine/prism';
import { IconOutlineBolt } from '@novu/novui/icons';
import { Tabs, Title } from '@novu/novui';
import { HStack } from '@novu/novui/jsx';
import { FC } from 'react';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface IWorkflowTestStepTriggerPanelProps {}

// TODO: placeholder for real code
const CODE = (
  <Prism withLineNumbers={true} language="javascript" h="100%">
    {`
import { Novu } from “@novu/node”; 

const novu = new Novu(“<APIkey•••••••••••>”);

novu.trigger(“digest-workflow-example”, {
to: {
“subscriberId”:“63eba45f8c05635c0ab0hjdkhfkHFKdjhfsdjkhf
“email”:“nikolay@novu.co”
}
});
`}
  </Prism>
);

export const WorkflowTestStepTriggerPanel: FC<IWorkflowTestStepTriggerPanelProps> = ({}) => {
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
            content: CODE,
          },
          {
            value: 'curl',
            label: 'Curl',
            content: CODE,
          },
          {
            value: 'php',
            label: 'PHP',
            content: CODE,
          },
          {
            value: 'golang',
            label: 'GOlang',
            content: CODE,
          },
          {
            value: 'python',
            label: 'Python',
            content: CODE,
          },
        ]}
      />
    </Box>
  );
};
