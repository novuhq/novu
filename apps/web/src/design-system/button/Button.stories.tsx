import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { Group } from '@mantine/core';
import { Button } from './Button';

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
  title: 'Components/Button',
  component: Button,

  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  argTypes: {},
} as ComponentMeta<typeof Button>;

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
const Template: ComponentStory<typeof Button> = ({ ...args }) => <Button {...args}>Click Me</Button>;

export const Default = Template.bind({});
Default.args = {};

export const Loading = Template.bind({});
Loading.args = {
  loading: true,
};

export const filled = () => (
  <Group>
    <Button size="lg">Large</Button>
    <Button>Medium</Button>
  </Group>
);

export const outline = () => (
  <Group>
    <Button size="lg" variant="outline">
      Large
    </Button>
    <Button variant="outline">Medium</Button>
  </Group>
);

export const disabled = () => (
  <Group>
    <Button disabled>Filled</Button>
    <Button variant="outline" disabled>
      Outline
    </Button>
  </Group>
);
