import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { TextInput } from './TextInput';

export default {
  title: 'Input/TextInput',
  component: TextInput,
  argTypes: {
    value: {
      table: {
        disable: true,
      },
    },
  },
} as ComponentMeta<typeof TextInput>;

const Template: ComponentStory<typeof TextInput> = ({ ...args }) => <TextInput {...args} />;

export const PrimaryUse = Template.bind({});
PrimaryUse.args = {
  label: 'Notification Name',
  placeholder: 'Notification name goes here...',
};

export const Error = Template.bind({});
Error.args = {
  label: 'Your Email',
  value: 'NotGood@email.com',
  error: 'Not Good!',
};
