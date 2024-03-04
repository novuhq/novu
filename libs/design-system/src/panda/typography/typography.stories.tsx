import { Meta } from '@storybook/react';
import React from 'react';
import { Divider, Flex } from '../../../styled-system/jsx';
import { Text } from './Text';
import { Title } from './Title';

export default {
  title: 'Panda/Components/Typography',
  component: Text,
  argTypes: {},
} as Meta<typeof Text>;

export const all = () => (
  <Flex direction="column" gap="100">
    <Text>Default Body</Text>
    <Text variant="text.main">Main text</Text>
    <Text variant="text.secondary">Secondary text</Text>
    <Text variant="text.strong">Strong text</Text>
    <Text variant="text.mono">Mono text</Text>
    <Divider />
    <Title>Default title</Title>
    <Title variant="title.page">Page title</Title>
    <Title variant="title.section">Section title</Title>
    <Title variant="title.subsection">Subsection title</Title>
  </Flex>
);
