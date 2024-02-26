import styled from '@emotion/styled';
import { Group } from '@mantine/core';
import { colors, Text } from '@novu/design-system';
import { EmojiIcon, SendIcon } from '../common';

export function ChatInput() {
  return (
    <InputStyled>
      <Text color={colors.B40}>Message Bot</Text>
      <Group spacing={21}>
        <EmojiIcon />
        <SendIcon />
      </Group>
    </InputStyled>
  );
}

const InputStyled = styled.div`
  display: flex;
  padding: 16px;
  justify-content: space-between;
  align-items: center;
  align-self: stretch;

  border-radius: 8px;
  border: 1px solid ${colors.B40};
  opacity: 0.2;
  background: transparent;
  margin-top: 20px;
`;
