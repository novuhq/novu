import { Meta } from '@storybook/react';
import React from 'react';
import { Flex } from '../../../styled-system/jsx';
import { Title } from './Title';

export default {
  title: 'Components/Title',
  component: Title,
  argTypes: {},
} as Meta<typeof Title>;

export const all = () => (
  <Flex direction="column" gap="100">
    <Title>Default title</Title>
    <Title variant="page">Page title</Title>
    <Title variant="section">Section title</Title>
    <Title variant="subsection">Subsection title</Title>
    <Title color="typography.text.feedback.success" textDecoration="underline">
      Styled Title
    </Title>
    <Title as="span">Title as span</Title>
  </Flex>
);
