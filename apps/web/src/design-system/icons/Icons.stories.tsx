import React, { useState } from 'react';
import { Group, Code, ActionIcon, Text, Grid } from '@mantine/core';
import * as allIcons from '.';
import { Input } from '../input/Input';

export default {
  title: 'Icons/Icons',
  parameters: {
    controls: { hideNoControlsWarning: true },
    viewMode: 'canvas',
    previewTabs: {
      'storybook/docs/panel': {
        hidden: true,
      },
    },
  },
  argTypes: {},
};

export const Icons = () => {
  const [search, setSearch] = useState('');
  const [iconName, setIconName] = useState('IconName');

  return (
    <div style={{ width: '100%', margin: 'auto' }}>
      <Input label="Search Icon" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
      <Grid align="center" gutter="xs" style={{ padding: '10px', paddingTop: '20px', paddingBottom: '20px' }}>
        {Object.entries(allIcons).map(([name, Icon]) => {
          if (name.includes(search.toLowerCase())) {
            return (
              <Grid.Col key={name} span={3}>
                <Group align="center" spacing={3}>
                  <ActionIcon variant="transparent" onClick={() => setIconName(name)}>
                    <Icon width="20px" height="20px" />
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
      <Code block>
        {`
import { ${iconName} } from 'apps/web/src/design-system/icons'
     
<${iconName}/> `}
      </Code>
    </div>
  );
};
