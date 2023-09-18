import React from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { NotificationCenter } from '../components';

export default {
  title: 'Example/Bell',
  component: NotificationCenter,
  parameters: {
    layout: 'fullscreen',
  },
} as Meta<typeof NotificationCenter>;

const templateElement: StoryFn<typeof NotificationCenter> = (args) => <NotificationCenter {...args} />;

export const template = templateElement.bind({});
