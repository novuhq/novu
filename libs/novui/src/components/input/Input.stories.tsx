import React from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { Input } from './Input';

export default {
  title: 'Components/Input',
  component: Input,
  argTypes: {},
} as Meta<typeof Input>;

const Template: StoryFn<typeof Input> = ({ ...args }) => <Input {...args} />;

export const all = ({ ...args }) => <Input label="Name" placeholder="Your name" />;
