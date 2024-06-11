import React from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { Button } from './Button';
import { Flex } from '../../../styled-system/jsx';
import { Icon10K, IconInfo } from '../../icons';

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
  <Flex>
    <Button size="lg" Icon={Icon10K}>
      Large
    </Button>
    <Button Icon={IconInfo}>Medium</Button>
  </Flex>
);

export const filled = () => (
  <Flex>
    <Button size="lg">Large</Button>
    <Button>Medium</Button>
  </Flex>
);

export const outline = () => (
  <Flex>
    <Button size="lg" variant="outline">
      Large
    </Button>
    <Button variant="outline">Medium</Button>
  </Flex>
);

export const disabled = () => (
  <Flex>
    <Button disabled>Filled</Button>
    <Button variant="outline" disabled>
      Outline
    </Button>
  </Flex>
);
