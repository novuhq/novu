import { Meta } from '@storybook/react';
import React from 'react';
import { Divider, Flex, styled } from '../../../styled-system/jsx';
import { text, title } from '../../../styled-system/recipes';

const Text = styled('p', text);
const Title = styled('h2', title);

export default {
  title: 'Panda/Components/Typography',
  component: Text,
  argTypes: {},
} as Meta<typeof Text>;

export const all = () => (
  <Flex direction="column" gap="100">
    <Text>Default Body</Text>
    <Text variant="main">Main text</Text>
    <Text variant="secondary">Secondary text</Text>
    <Text variant="strong">Strong text</Text>
    <Text variant="mono">Mono text</Text>
    <Divider />
    <Title>Default title</Title>
    <Title variant="page">Page title</Title>
    <Title variant="section">Section title</Title>
    <Title variant="subsection">Subsection title</Title>
  </Flex>
);
