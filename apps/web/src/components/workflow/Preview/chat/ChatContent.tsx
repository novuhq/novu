import styled from '@emotion/styled';
import { Group, Stack } from '@mantine/core';
import { colors, Text, Title } from '@novu/design-system';
import React from 'react';
import { NovuGreyIcon } from '../common';

export function ChatContent({ content }) {
  return (
    <Group spacing={16} align="flex-start" noWrap pt={24} pb={40}>
      <div>
        <NovuGreyIcon width="32px" height="32px" />
      </div>
      <Stack spacing={5}>
        <Group spacing={8} align="flex-start" noWrap>
          <Text
            weight="bold"
            color={colors.B80}
            size="lg"
            style={{
              lineHeight: '20px',
            }}
          >
            Your App
          </Text>
          <PillStyled>APP</PillStyled>
          <Text color={colors.B60}>now</Text>
        </Group>
        <Text color={colors.B80}>{content}</Text>
      </Stack>
    </Group>
  );
}

const PillStyled = styled.div`
  background-color: ${colors.B40};
  border-radius: 4px;
  display-flex;
  padding: 0px 6px;
  align-items: center;
  color: ${colors.B80};
  font-size: 10px;
  font-weight: 400;
  line-height: 20px;
`;
