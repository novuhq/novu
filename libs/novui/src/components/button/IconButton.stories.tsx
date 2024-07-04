import { Meta, StoryFn } from '@storybook/react';
import React from 'react';
import { Grid } from '../../../styled-system/jsx';
import { Icon123, IconSettings } from '../../icons';
import { Title } from '../title';
import { IconButton } from './IconButton';

export default {
  title: 'Components/IconButton',
  component: IconButton,
  argTypes: {},
} as Meta<typeof IconButton>;

const Template: StoryFn<typeof IconButton> = ({ ...args }) => {
  return (
    <Grid gridTemplateColumns="4">
      <Title variant="subsection">Default</Title>
      <IconButton {...args} Icon={IconSettings} />
      <IconButton {...args} Icon={IconSettings} disabled />
      <IconButton {...args} Icon={IconSettings} loading />

      <Title variant="subsection">Transparent</Title>
      <IconButton {...args} Icon={IconSettings} variant="transparent" />
      <IconButton {...args} Icon={IconSettings} variant="transparent" disabled />
      <IconButton {...args} Icon={IconSettings} variant="transparent" loading />

      <Title variant="subsection">Filled</Title>
      <IconButton {...args} Icon={IconSettings} variant="filled" />
      <IconButton {...args} Icon={IconSettings} variant="filled" disabled />
      <IconButton {...args} Icon={IconSettings} variant="filled" loading />

      <Title variant="subsection">Outline</Title>
      <IconButton {...args} Icon={IconSettings} variant="outline" />
      <IconButton {...args} Icon={IconSettings} variant="outline" disabled />
      <IconButton {...args} Icon={IconSettings} variant="outline" loading />
    </Grid>
  );
};
export const Default = Template.bind({});
