import React from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { Text } from './Text';
import { styled } from '../../../styled-system/jsx';
import { text } from '../../../styled-system/recipes';

export default {
  title: 'Panda/Components/Typography',
  component: Text,
  argTypes: {},
} as Meta<typeof Text>;

const Template: StoryFn<typeof Text> = ({ ...args }) => <Text {...args}>Example Text</Text>;

const MyText = styled('p', text);

export const all = () => (
  <div>
    <Text>Default Body</Text>
    <MyText variant="strong" fontWeight="bold">
      Testing
    </MyText>
    <Text variant="main">Main text</Text>
    <Text variant="secondary">Secondary text</Text>
    <Text variant="strong">Strong text</Text>
    <Text variant="mono">Mono text</Text>
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
