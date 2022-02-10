import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { Group } from '@mantine/core';
import { Checkbox } from './Checkbox';

export default {
  title: 'Components/Checkbox',
  component: Checkbox,
  argTypes: {},
} as ComponentMeta<typeof Checkbox>;

const Template: ComponentStory<typeof Checkbox> = ({ ...args }) => <Checkbox {...args} />;

export const Default = Template.bind({});
Default.args = {
  label: 'Checkbox Label',
};

export const States = () => (
  <Group style={{ display: 'flex', flexDirection: 'column', alignItems: 'unset' }}>
    <Checkbox label="Indeterminate Checkbox" indeterminate />
    <Checkbox label="Checked checkbox" checked />
    <Checkbox label="Disabled checkbox" disabled />
    <Checkbox label="Disabled checked checkbox" checked disabled />
    <Checkbox label="Disabled indeterminate checkbox" disabled indeterminate />
  </Group>
);

export const Sizes = () => (
  <Group style={{ display: 'flex', flexDirection: 'column', alignItems: 'unset' }}>
    <Checkbox label="xs" size="xs" />
    <Checkbox label="sm" size="sm" />
    <Checkbox label="md" size="md" />
    <Checkbox label="lg" size="lg" />
    <Checkbox label="xl" size="xl" />
  </Group>
);
