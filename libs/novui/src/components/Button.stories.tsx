import React from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { Button } from './Button';

export default {
  title: 'Components/Button',
  component: Button,
  argTypes: {},
} as Meta<typeof Button>;

const Template: StoryFn<typeof Button> = ({ ...args }) => <Button {...args}>Example Text</Button>;

export const all = () => <Button onClick={() => alert('hello')} />;
