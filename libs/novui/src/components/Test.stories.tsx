import React from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { Test } from './Test';

export default {
  title: 'Components/Test',
  component: Test,
  argTypes: {},
} as Meta<typeof Test>;

const Template: StoryFn<typeof Test> = ({ ...args }) => <Test {...args}>Example Text</Test>;

export const all = () => <Test onClick={() => alert('Test!')} />;
