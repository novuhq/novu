import { Meta } from '@storybook/react';
import React from 'react';
import { Flex } from '../../../styled-system/jsx';
import { Text } from './Text';

export default {
  title: 'Components/Text',
  component: Text,
  argTypes: {},
} as Meta<typeof Text>;

export const all = () => (
  <Flex direction="column" gap="100">
    <Text>Default Body</Text>
    <Text as="span">Default Body as span</Text>
    <Text variant="main">Main text</Text>
    <Text variant="main" fontWeight={'strong'} color="typography.text.feedback.success">
      Success text
    </Text>
    <Text variant="secondary">Secondary text</Text>
    <Text variant="strong">Strong text</Text>
    <Text variant="mono">Mono text</Text>
  </Flex>
);
