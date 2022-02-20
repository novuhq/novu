import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { ColorPicker } from './ColorPicker';

export default {
  title: 'Inputs/ColorPicker',
  component: ColorPicker,
  argTypes: {
    value: {
      table: {
        disable: true,
      },
    },
    onChange: {
      table: {
        disable: true,
      },
    },
  },
} as ComponentMeta<typeof ColorPicker>;

const Template: ComponentStory<typeof ColorPicker> = ({ ...args }) => <ColorPicker {...args} />;

export const PrimaryUse = Template.bind({});
PrimaryUse.args = {
  label: 'Notification Name',
  placeholder: 'Notification name goes here...',
};
