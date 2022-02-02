import { useMantineTheme, ColorSwatch, Group } from '@mantine/core';
import React from 'react';

export default {
  title: 'Components/Colors',
  // parameters: {
  //   previewTabs: {
  //     'storybook/docs/panel': {
  //       hidden: true,
  //     },
  //   },
  // },
};

const theme = useMantineTheme();

export const example = () => {
  const swatches = Object.keys(theme.colors).map((color) => <ColorSwatch key={color} color={theme.colors[color][6]} />);

  return (
    <Group position="center" spacing="xs">
      {swatches}
    </Group>
  );
};

export const gray = () => {
  const colors = theme.colors.gray;
  return (
    <ul>
      {colors.map((color) => (
        <li>
          <span
            style={{
              backgroundColor: colors[color],
              display: 'block',
              height: '4em',
              marginBottom: '0.3em',
              borderRadius: '5px',
              border: '1px solid lightgray',
            }}
          />
          <span>{color}</span>
          <br />
          <span>{colors[color]}</span> <br />
        </li>
      ))}
    </ul>
  );
};
