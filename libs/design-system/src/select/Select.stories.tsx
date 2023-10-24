import React from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { Select } from './Select';

export default {
  title: 'Inputs/Select',
  component: Select,
  argTypes: {},
} as Meta<typeof Select>;

const Template: StoryFn<typeof Select> = ({ ...args }) => <Select {...args} />;

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

export const WithMultiSelect = Template.bind({});
WithMultiSelect.args = {
  type: 'multiselect',
  label: 'Font Family',
  data,
  placeholder: 'Select',
};

export const SearchWithSelect = Template.bind({});
SearchWithSelect.args = {
  searchable: true,
  label: 'Font Family',
  data,
  placeholder: 'Find and select',
};

export const SearchWithMultiSelect = Template.bind({});
SearchWithMultiSelect.args = {
  searchable: true,
  type: 'multiselect',
  label: 'Font Family',
  data,
  placeholder: 'Find and select as many as you want',
};
