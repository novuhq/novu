import React from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { Title } from './Title';

export default {
  title: 'Components/Typography/Title',
  component: Title,
  argTypes: {},
} as Meta<typeof Title>;

const Template: StoryFn<typeof Title> = ({ ...args }) => <Title {...args}>Example Text</Title>;

export const all = () => (
  <div>
    <Title>Header 1</Title>
    <Title size={2}>Header 2</Title>
  </div>
);

export const Header1 = Template.bind({});
Header1.args = {
  size: 1,
};

export const Header2 = Template.bind({});
Header2.args = {
  size: 2,
};
