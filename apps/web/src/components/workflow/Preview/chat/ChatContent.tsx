import styled from '@emotion/styled';
import { Group, Stack } from '@mantine/core';
import { colors, Text } from '@novu/design-system';
import { useState } from 'react';
import { NovuGreyIcon, PreviewEditOverlay } from '../common';

export function ChatContent({ content, error }) {
  const [isEditOverlayVisible, setIsEditOverlayVisible] = useState(false);

  const handleMouseEnter = () => {
    setIsEditOverlayVisible(true);
  };

  const handleMouseLeave = () => {
    setIsEditOverlayVisible(false);
  };

  return (
    <Group
      spacing={16}
      align="flex-start"
      noWrap
      pt={24}
      pb={20}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      sx={{
        position: 'relative',
      }}
    >
      {isEditOverlayVisible && <PreviewEditOverlay />}
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
        {error && error.template?.content && error.template?.content?.message ? (
          <Text color={colors.error}>{error.template.content.message}</Text>
        ) : (
          <Text color={colors.B80}>{content}</Text>
        )}
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
