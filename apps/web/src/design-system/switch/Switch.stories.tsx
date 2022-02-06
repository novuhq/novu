import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { Group } from '@mantine/core';
import { Switch } from './Switch';

export default {
  title: 'Components/Switch',
  component: Switch,
  argTypes: {},
} as ComponentMeta<typeof Switch>;

const Template: ComponentStory<typeof Switch> = ({ ...args }) => <Switch {...args} />;

export const Default = Template.bind({});
Default.args = {};

export const SwitchStates = () => (
  <Group>
    <Switch checked={false} />
    <Switch checked />
  </Group>
);

export const WithLabels = () => (
  <Group>
    <Switch checked={false} label="Disabled" />
    <Switch checked label="Enabled" />
  </Group>
);
