import { StoryFn, Meta } from '@storybook/react';
import React from 'react';

import { Modal } from './Modal';

export default {
  title: 'Components/Modal',

  component: Modal,

  argTypes: {
    colorPalette: {
      options: ['mode.cloud', 'mode.local'],
    },
  },
} as Meta<typeof Modal>;
const Template: StoryFn<typeof Modal> = ({ ...args }) => <Modal {...args} />;

export const Default = Template.bind({});
Default.args = {
  opened: true,
  title: 'Modal Title',
};
