import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { Bell } from '../components';

export default {
  title: 'Example/Bell',
  component: Bell,
  parameters: {
    layout: 'fullscreen',
  },
} as ComponentMeta<typeof Bell>;

const templateElement: ComponentStory<typeof Bell> = (args) => <Bell {...args} />;

export const template = templateElement.bind({});
