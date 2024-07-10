import React, { useState } from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { DEFAULT_ICON_SIZE } from './Icon.const';
import { IIconProps, IconSize } from './Icon.types';
import { Grid, Group, ActionIcon, Code, Text } from '@mantine/core';
import { Input } from '../input/Input';
import * as allIcons from './icon-registry';

export default {
  title: 'Icons/IconsV2',
  args: {
    size: DEFAULT_ICON_SIZE as IconSize,
    color: undefined,
  },
  argTypes: {
    color: { control: 'color' },
  },
} as Meta<IIconProps>;

const IconsWrapper = ({ color, size }: IIconProps) => {
  const [search, setSearch] = useState('');
  const [iconName, setIconName] = useState('IconName');

  return (
    <div style={{ width: '100%', height: '100%', margin: 'auto', overflowY: 'auto' }}>
      <Code block mb={20}>
        {`import { ${iconName} } from '@novu/design-system'
     
<${iconName} /> `}
      </Code>
      <Input label="Search Icon" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
      <Grid align="center" gutter="xs" style={{ padding: '10px', paddingTop: '20px', paddingBottom: '20px' }}>
        {Object.entries(allIcons).map(([name, Icon]) => {
          if (name.includes(search.toLowerCase())) {
            return (
              <Grid.Col key={name} span={3}>
                <Group align="center" spacing={3}>
                  <ActionIcon variant="transparent" onClick={() => setIconName(name)}>
                    <Icon color={color} size={size} />
                  </ActionIcon>
                  <Text align="center" weight={400} size="xs">
                    {name}
                  </Text>
                </Group>
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
