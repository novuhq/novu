import { Meta, StoryFn } from '@storybook/react';
import React from 'react';
import { Grid } from '../../../styled-system/jsx';
import { IconSettings, IconOutlineInfo } from '../../icons';
import { Title } from '../title';
import { Button } from './Button';

export default {
  title: 'Components/Button',
  component: Button,
  argTypes: {
    size: {
      options: ['xs', 'sm', 'md', 'lg'],
      control: { type: 'select' },
    },
    fullWidth: {
      type: 'boolean',
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

const SizeTemplate: StoryFn<typeof Button> = ({ ...args }) => {
  return (
    <Grid gridTemplateColumns="5">
      <Title variant="subsection"></Title>
      <Title variant="subsection">xs</Title>
      <Title variant="subsection">sm</Title>
      <Title variant="subsection">md</Title>
      <Title variant="subsection">lg</Title>

      <Title variant="subsection">Default</Title>
      <Button {...args} Icon={IconOutlineInfo} size="xs">
        Button copy
      </Button>
      <Button {...args} Icon={IconOutlineInfo} size="sm">
        Button copy
      </Button>
      <Button {...args} Icon={IconOutlineInfo} size="md">
        Button copy
      </Button>
      <Button {...args} Icon={IconOutlineInfo} size="lg">
        Button copy
      </Button>

      <Title variant="subsection">Filled</Title>
      <Button {...args} Icon={IconOutlineInfo} size="xs" variant="filled">
        Button copy
      </Button>
      <Button {...args} Icon={IconOutlineInfo} size="sm" variant="filled">
        Button copy
      </Button>
      <Button {...args} Icon={IconOutlineInfo} size="md" variant="filled">
        Button copy
      </Button>
      <Button {...args} Icon={IconOutlineInfo} size="lg" variant="filled">
        Button copy
      </Button>

      <Title variant="subsection">Transparent</Title>
      <Button {...args} Icon={IconOutlineInfo} size="xs" variant="transparent">
        Button copy
      </Button>
      <Button {...args} Icon={IconOutlineInfo} size="sm" variant="transparent">
        Button copy
      </Button>
      <Button {...args} Icon={IconOutlineInfo} size="md" variant="transparent">
        Button copy
      </Button>
      <Button {...args} Icon={IconOutlineInfo} size="lg" variant="transparent">
        Button copy
      </Button>

      <Title variant="subsection">Outline</Title>
      <Button {...args} Icon={IconOutlineInfo} size="xs" variant="outline">
        Button copy
      </Button>
      <Button {...args} Icon={IconOutlineInfo} size="sm" variant="outline">
        Button copy
      </Button>
      <Button {...args} Icon={IconOutlineInfo} size="md" variant="outline">
        Button copy
      </Button>
      <Button {...args} Icon={IconOutlineInfo} size="lg" variant="outline">
        Button copy
      </Button>
    </Grid>
  );
};

export const Sizes = SizeTemplate.bind({});
