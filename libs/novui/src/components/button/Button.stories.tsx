import { Meta, StoryFn } from '@storybook/react';
import React from 'react';
import { Grid } from '../../../styled-system/jsx';
import { IconSettings } from '../../icons';
import { Title } from '../title';
import { Button } from './Button';

export default {
  title: 'Components/Button',
  component: Button,
  argTypes: {
    size: {
      options: ['sm', 'md', 'lg'],
      control: { type: 'select' },
    },
  },
} as Meta<typeof Button>;

const Template: StoryFn<typeof Button> = ({ ...args }) => {
  return (
    <Grid gridTemplateColumns="5">
      <Title variant="subsection">Default</Title>
      <Button {...args}>Test</Button>
      <Button {...args} Icon={IconSettings}>
        Test
      </Button>
      <Button {...args} Icon={IconSettings} disabled>
        Test
      </Button>
      <Button {...args} Icon={IconSettings} loading>
        Test
      </Button>

      <Title variant="subsection">Filled</Title>
      <Button {...args} variant="filled">
        Test
      </Button>
      <Button {...args} Icon={IconSettings} variant="filled">
        Test
      </Button>
      <Button {...args} Icon={IconSettings} variant="filled" disabled>
        Test
      </Button>
      <Button {...args} Icon={IconSettings} variant="filled" loading>
        Test
      </Button>

      <Title variant="subsection">Transparent</Title>
      <Button {...args} variant="transparent">
        Test
      </Button>
      <Button {...args} Icon={IconSettings} variant="transparent">
        Test
      </Button>
      <Button {...args} Icon={IconSettings} variant="transparent" disabled>
        Test
      </Button>
      <Button {...args} Icon={IconSettings} variant="transparent" loading>
        Test
      </Button>

      <Title variant="subsection">Outline</Title>
      <Button {...args} variant="outline">
        Test
      </Button>
      <Button {...args} Icon={IconSettings} variant="outline">
        Test
      </Button>
      <Button {...args} Icon={IconSettings} variant="outline" disabled>
        Test
      </Button>
      <Button {...args} Icon={IconSettings} variant="outline" loading>
        Test
      </Button>
    </Grid>
  );
};

export const Default = Template.bind({});
