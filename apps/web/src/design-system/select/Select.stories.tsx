import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { Select } from './Select';

export default {
  title: 'Inputs/Select',
  component: Select,
  argTypes: {},
} as ComponentMeta<typeof Select>;

const Template: ComponentStory<typeof Select> = ({ ...args }) => <Select {...args} />;

const data = [
  { value: 'Arial', label: 'Arial' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Optima', label: 'Optima' },
  { value: 'Lato', label: 'Lato' },
  { value: 'sans-serif', label: 'sans-serif' },
  { value: 'blitz', label: 'Blitz.js' },
];

export const PrimaryUse = Template.bind({});
PrimaryUse.args = {
  label: 'Font Family',
  data,
  description: 'Will be used as the main font-family in the in-app widget',
  placeholder: 'Select',
};

export const WithCheckbox = Template.bind({});
WithCheckbox.args = {
  type: 'Checkbox',
  label: 'Font Family',
  data,
  placeholder: 'Select',
};
