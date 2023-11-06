import React from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { Group } from '@mantine/core';
import { Button } from './Button';

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
