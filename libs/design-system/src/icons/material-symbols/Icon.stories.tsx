import React from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { Icon } from './Icon';
import { MaterialSymbol } from 'material-symbols';

export default {
  title: 'Components/MaterialIcon',
  component: Icon,
  args: {
    isFilled: false,
    weight: 400,
    grade: 0,
    size: 24,
    name: 'home' as MaterialSymbol,
  },
} as Meta<typeof Icon>;

const Template: StoryFn<typeof Icon> = ({ ...args }) => <Icon {...args} />;

export const Icons = Template.bind({});
Icons.args = {};
