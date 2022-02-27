import { ComponentStory, ComponentMeta } from '@storybook/react';

import { Tab } from './Tabs';

export default {
  title: 'Menus/TabMenu',

  component: Tab,

  argTypes: {},
} as ComponentMeta<typeof Tab>;

const Template: ComponentStory<typeof Tab> = ({ ...args }) => <Tab {...args} />;

export const Default = Template.bind({});
Default.args = {
  MenuTab: [
    {
      label: 'Branding',
      content: 'Branding',
    },

    {
      label: 'In App Center',
      content: 'In App Center',
    },

    {
      label: 'Email Settings',
      content: 'Email Settings',
    },

    {
      label: 'SMS',
      content: 'SMS',
    },

    {
      label: 'Api Keys',
      content: 'Api Keys',
    },
  ],
};

export const VerticalTabMenu = Template.bind({});
VerticalTabMenu.args = {
  ...Default.args,

  orientation: 'vertical',
};

export const HorizontalTabMenuWithIcon = Template.bind({});
HorizontalTabMenuWithIcon.args = {
  MenuTab: [
    {
      label: 'Branding',
      content: 'Branding',
      icon: '46',
    },

    {
      label: 'In App Center',
      content: 'In App Center',
      icon: '45',
    },

    {
      label: 'Email Settings',
      content: 'Email Settings',
      icon: '44',
    },

    {
      label: 'SMS',
      content: 'SMS',
      icon: '43',
    },

    {
      label: 'Api Keys',
      content: 'Api Keys',
      icon: '42',
    },
  ],

  withIcon: true,
};

export const VerticalTabMenuWithIcon = Template.bind({});
VerticalTabMenuWithIcon.args = {
  ...HorizontalTabMenuWithIcon.args,

  withIcon: true,

  orientation: 'vertical',
};
