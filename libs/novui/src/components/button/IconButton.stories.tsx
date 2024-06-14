import { Meta } from '@storybook/react';
import React from 'react';
import { Grid } from '../../../styled-system/jsx';
import { IconSettings } from '../../icons';
import { Title } from '../title';
import { IconButton } from './IconButton';

export default {
  title: 'Components/IconButton',
  component: IconButton,
  argTypes: {},
} as Meta<typeof IconButton>;

export const all = () => (
  <Grid gridTemplateColumns="4">
    <Title variant="subsection">Default</Title>
    <IconButton Icon={IconSettings} />
    <IconButton Icon={IconSettings} disabled />
    <IconButton Icon={IconSettings} loading />

    <Title variant="subsection">Transparent</Title>
    <IconButton Icon={IconSettings} variant="transparent" />
    <IconButton Icon={IconSettings} variant="transparent" disabled />
    <IconButton Icon={IconSettings} variant="transparent" loading />

    <Title variant="subsection">Filled</Title>
    <IconButton Icon={IconSettings} variant="filled" />
    <IconButton Icon={IconSettings} variant="filled" disabled />
    <IconButton Icon={IconSettings} variant="filled" loading />

    <Title variant="subsection">Outline</Title>
    <IconButton Icon={IconSettings} variant="outline" />
    <IconButton Icon={IconSettings} variant="outline" disabled />
    <IconButton Icon={IconSettings} variant="outline" loading />
  </Grid>
);
