import React from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { Select } from './Select';

export default {
  title: 'Components/Select',
  component: Select,
  argTypes: {},
} as Meta<typeof Select>;

const Template: StoryFn<typeof Select> = ({ ...args }) => <Select {...args} />;

export const all = ({ ...args }) => (
  <Select label="Your favorite library" placeholder="Pick value" data={['React', 'Angular', 'Vue', 'Svelte']} />
);
