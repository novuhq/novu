import React from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { Toggle as CToggle, ToggleProps } from './Toggle';

export default {
  title: 'Components/Toggle',
  component: CToggle,
  argTypes: {
    onChange: {
      table: {
        disable: true,
      },
    },
    className: {
      table: {
        disable: true,
      },
    },
    label: {
      control: 'text',
    },
  },
} as Meta<ToggleProps>;

const Template: StoryFn<ToggleProps> = ({ ...args }) => <CToggle {...args} />;

export const Toggle = Template.bind({});
Toggle.args = {};
