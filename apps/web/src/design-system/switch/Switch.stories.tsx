import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { Switch } from './Switch';

export default {
  title: 'Components/Switch',
  component: Switch,
  argTypes: {
    label: {
      control: false,
    },
    onChange: {
      table: {
        disable: true,
      },
    },
  },
} as ComponentMeta<typeof Switch>;

const Template: ComponentStory<typeof Switch> = ({ ...args }) => <Switch {...args} />;

export const Default = Template.bind({});
Default.args = {};

export const Label = Template.bind({});
Label.args = {
  label: 'Label',
};
