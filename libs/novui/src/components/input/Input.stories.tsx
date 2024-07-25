import React from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { Input } from './Input';
import { IconContentCopy } from '../../icons';
import { Button } from '../button';
import { stack } from '../../../styled-system/patterns/stack';

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
    error: {
      type: 'string',
    },
    variant: {
      options: ['preventLayoutShift', undefined],
      control: {
        type: 'select',
      },
    },
  },
} as Meta<typeof Input>;

const Template: StoryFn<typeof Input> = ({ ...args }) => <Input {...args} />;

export const PrimaryUse = Template.bind({});
PrimaryUse.args = {
  label: 'Notification Name',
  placeholder: 'Notification name goes here...',
  required: true,
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

const FormTemplate: StoryFn<typeof Input> = ({ ...args }) => {
  return (
    <form noValidate onSubmit={(event) => event.preventDefault()}>
      <Input variant="preventLayoutShift" {...args} />
      <Input variant="preventLayoutShift" {...args} />
      <Input variant="preventLayoutShift" {...args} placeholder="This won't have an error" error={undefined} />
      <Input variant="preventLayoutShift" {...args} />
      <Button type="submit">Submit</Button>
    </form>
  );
};

export const InForm = FormTemplate.bind({});
InForm.args = {
  label: 'Your Email',
  required: true,
};
