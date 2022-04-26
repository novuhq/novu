import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { NotificationCenter } from '../components';

export default {
  title: 'Example/Bell',
  component: NotificationCenter,
  parameters: {
    layout: 'fullscreen',
  },
} as ComponentMeta<typeof NotificationCenter>;

const templateElement: ComponentStory<typeof NotificationCenter> = (args) => <NotificationCenter {...args} />;

export const template = templateElement.bind({});
