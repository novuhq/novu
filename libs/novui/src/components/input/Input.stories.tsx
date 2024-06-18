import React from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { Input } from './Input';
import { IconContentCopy } from '../../icons';

export default {
  title: 'Components/Input',
  component: Input,
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
} as Meta<typeof Input>;

const Template: StoryFn<typeof Input> = ({ ...args }) => <Input {...args} />;

export const PrimaryUse = Template.bind({});
PrimaryUse.args = {
  label: 'Notification Name',
  placeholder: 'Notification name goes here...',
};

export const Everything = Template.bind({});
Everything.args = {
  label: 'Notification Name',
  description: 'Will be used as identifier',
  placeholder: 'Notification name goes here...',
  rightSection: <IconContentCopy />,
  error: 'Not Good!',
};

export const Nothing = Template.bind({});
Nothing.args = {};

export const WithDescription = Template.bind({});
WithDescription.args = {
  label: 'Notification Name',
  description: 'Will be used as identifier',
  placeholder: 'Notification name goes here...',
};

export const WithIcon = Template.bind({});
WithIcon.args = {
  label: 'Notification Name',
  value: 'e297cdd6cf29ea8f566c06da18ccf151',
  rightSection: <IconContentCopy />,
};

export const Error = Template.bind({});
Error.args = {
  label: 'Your Email',
  value: 'NotGood@email.com',
  error: 'Not Good!',
};
