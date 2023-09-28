import React from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { Text } from './Text';

export default {
  title: 'Components/Typography/Text',
  component: Text,
  argTypes: {},
} as Meta<typeof Text>;

const Template: StoryFn<typeof Text> = ({ ...args }) => <Text {...args}>Example Text</Text>;

export const all = () => (
  <div>
    <Text>Default Body</Text>
    <Text size="lg">Body Large</Text>
    <Text weight="bold">Body Bold</Text>
    <Text size="md" weight="bold">
      Body Large Bold
    </Text>
  </div>
);

export const Body = Template.bind({});
Body.args = {};

export const BodyLarge = Template.bind({});
BodyLarge.args = {
  size: 'lg',
};

export const BodyBold = Template.bind({});
BodyBold.args = {
  weight: 'bold',
};

export const BodyLargeBold = Template.bind({});
BodyLargeBold.args = {
  size: 'lg',
  weight: 'bold',
};
