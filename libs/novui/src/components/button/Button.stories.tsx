import { Meta, StoryFn } from '@storybook/react';
import React from 'react';
import { Grid } from '../../../styled-system/jsx';
import { Icon10K, IconAddBox, IconInfo } from '../../icons';
import { Button } from './Button';

export default {
  title: 'Components/Button',
  component: Button,
  argTypes: {},
} as Meta<typeof Button>;

const Template: StoryFn<typeof Button> = ({ ...args }) => <Button {...args}>Click Me</Button>;

export const Default = Template.bind({});
Default.args = {};

export const Loading = Template.bind({});
Loading.args = {
  loading: true,
};

export const icon = () => (
  <Grid>
    <Button size="lg" Icon={Icon10K}>
      Large
    </Button>
    <Button Icon={IconInfo}>Medium</Button>
  </Grid>
);

export const filled = () => (
  <Grid>
    <Button size="lg">Large</Button>
    <Button size="md">Medium</Button>
    <Button size="sm">Small</Button>
    <Button>Default</Button>
  </Grid>
);

export const outline = () => (
  <Grid>
    <Button size="lg" variant="outline">
      Large
    </Button>
    <Button variant="outline">Medium</Button>
    <Button size="lg" Icon={Icon10K} variant="outline">
      Large
    </Button>
    <Button Icon={IconInfo} variant="outline">
      Medium
    </Button>
  </Grid>
);

export const transparent = () => (
  <Grid>
    <Button size="lg" variant="transparent">
      Large
    </Button>
    <Button variant="transparent">Medium</Button>
    <Button size="lg" Icon={IconAddBox} variant="transparent">
      Large
    </Button>
    <Button Icon={IconAddBox} variant="transparent">
      Medium
    </Button>
    <Button Icon={IconAddBox} variant="transparent" disabled>
      Disabled
    </Button>
  </Grid>
);

export const disabled = () => (
  <Grid>
    <Button disabled>Filled</Button>
    <Button variant="outline" disabled>
      Outline
    </Button>
  </Grid>
);
