import { Meta, StoryFn } from '@storybook/react';
import React from 'react';
import { HStack } from '../../../styled-system/jsx';
import { Icon10K, IconInfo } from '../../icons';
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

export const icon = () => (
  <HStack>
    <Button size="lg" Icon={Icon10K}>
      Large
    </Button>
    <Button Icon={IconInfo}>Medium</Button>
  </HStack>
);

export const filled = () => (
  <HStack>
    <Button size="lg">Large</Button>
    <Button size="md">Medium</Button>
    <Button size="sm">Small</Button>
    <Button>Default</Button>
  </HStack>
);

export const outline = () => (
  <HStack>
    <Button size="lg" variant="outline">
      Large
    </Button>
    <Button variant="outline">Medium</Button>
    <Button size="lg" Icon={Icon10K} variant="outline">
      Large
    </Button>
    <Button Icon={IconInfo} variant="outline">
      Medium
    </Button>
  </HStack>
);

export const borderless = () => (
  <HStack>
    <Button size="lg" variant="borderless">
      Large
    </Button>
    <Button variant="borderless">Medium</Button>
    <Button size="lg" Icon={Icon10K} variant="borderless">
      Large
    </Button>
    <Button Icon={IconInfo} variant="borderless">
      Medium
    </Button>
    <Button Icon={IconInfo} variant="borderless" disabled>
      Disabled
    </Button>
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
