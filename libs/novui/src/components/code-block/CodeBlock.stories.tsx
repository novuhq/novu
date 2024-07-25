import React from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { CodeBlock } from './CodeBlock';

export default {
  title: 'Components/CodeBlock',
  component: CodeBlock,
  argTypes: {},
} as Meta<typeof CodeBlock>;

const Template: StoryFn<typeof CodeBlock> = ({ ...args }) => <CodeBlock {...args} />;

const apiKey = 'TH!Si$ASup3RSeCreTAP!KEy';
const bridgeUrl = 'https://your-bridge-url';

export const PrimaryUse = Template.bind({});
PrimaryUse.args = {
  language: 'yaml',
  code: `name: Deploy Workflow State to Novu

  on:
    workflow_dispatch:
  
  jobs:
    deploy:
      runs-on: ubuntu-latest
      steps:
        - name: Checkout code
          uses: actions/checkout@v2
  
        - name: Sync State to Novu
          uses: novuhq/actions-novu-sync@v0.0.4
          with:
            novu-api-key: ${apiKey}
            bridge-url: ${bridgeUrl}`,
};
