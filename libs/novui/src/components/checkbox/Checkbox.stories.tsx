import React from 'react';
import { Meta } from '@storybook/react';
import { Checkbox } from './Checkbox';

export default {
  title: 'Components/Checkbox',
  component: Checkbox,
  argTypes: {},
} as Meta<typeof Checkbox>;

export const all = ({ ...args }) => <Checkbox label={'Checked'} {...args} />;
