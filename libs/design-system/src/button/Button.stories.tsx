import React from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { Button } from './Button';
import { HStack } from '../../../novui/styled-system/jsx';

export default {
  title: 'Components/Button',
  component: Button,
  argTypes: {},
} as Meta<typeof Button>;

const Template: StoryFn<typeof Button> = ({ ...args }) => <Button {...args}>Click Me</Button>;

export const Default = Template.bind({});
Default.args = {};

export const Loading = Template.bind({});
Loading.args = {
  loading: true,
};

export const filled = () => (
  <HStack>
    <Button size="lg">Large</Button>
    <Button>Medium</Button>
  </HStack>
);

export const outline = () => (
  <HStack>
    <Button size="lg" variant="outline">
      Large
    </Button>
    <Button variant="outline">Medium</Button>
  </HStack>
);

export const disabled = () => (
  <HStack>
    <Button disabled>Filled</Button>
    <Button variant="outline" disabled>
      Outline
    </Button>
  </HStack>
);
