import React, { useState } from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { Grid, Group, ActionIcon, Code, Input } from '@mantine/core';
import { DEFAULT_ICON_SIZE } from './Icon.const';
import { IIconProps, IconSize } from './Icon.types';
// eslint-disable-next-line import/no-namespace
import * as allIcons from './icon-registry';
import { styled, VStack } from '../../styled-system/jsx';
import { text } from '../../styled-system/recipes';

export default {
  title: 'Icons/Icons',
  args: {
    size: DEFAULT_ICON_SIZE as IconSize,
    color: undefined,
  },
  argTypes: {
    color: { control: 'color' },
  },
} as Meta<IIconProps>;

const Text = styled('p', text);

const IconsWrapper = ({ color, size }: IIconProps) => {
  const [search, setSearch] = useState('');
  const [iconName, setIconName] = useState('IconName');

  return (
    <div style={{ width: '100%', height: '100%', margin: 'auto', overflowY: 'auto' }}>
      <Code block mb={20}>
        {`import { ${iconName} } from '@novu/novui'
     
<${iconName} /> `}
      </Code>
      <Input placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
      <Grid align="center" gutter="xs" style={{ padding: '10px', paddingTop: '20px', paddingBottom: '20px' }}>
        {Object.entries(allIcons).map(([name, Icon]) => {
          if (name.includes(search.toLowerCase())) {
            return (
              <Grid.Col key={name} span={3}>
                <VStack gap={'75'}>
                  <ActionIcon variant="transparent" onClick={() => setIconName(name)}>
                    <Icon color={color} size={size} />
                  </ActionIcon>
                  <Text fontSize="75">{name}</Text>
                </VStack>
              </Grid.Col>
            );
          }

          return null;
        })}
      </Grid>
    </div>
  );
};

const Template: StoryFn<IIconProps> = ({ ...args }) => <IconsWrapper {...args} />;

export const Icons = Template.bind({});
Icons.args = {};
