import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { Tooltip } from './Tooltip';

export default {
  title: 'Components/Tooltip',
  component: Tooltip,
  argTypes: {},
} as ComponentMeta<typeof Tooltip>;

const Template: ComponentStory<typeof Tooltip> = ({ ...args }) => <Tooltip {...args}>Hover Here</Tooltip>;

export const Label = Template.bind({});
Label.args = {
  label: 'This is a tooltip!',
};
