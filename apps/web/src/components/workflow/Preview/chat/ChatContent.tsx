import styled from '@emotion/styled';
import { Group, Stack } from '@mantine/core';
import { colors, Text, Title } from '@novu/design-system';
import React from 'react';
import { NovuGreyIcon } from '../common';

export function ChatContent() {
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
        <Text color={colors.B80}>
          Lorem ipsum dolor sit amet consectetur, adipisicing elit. Ipsam, quae. Est voluptas exercitationem nobis optio
          eos incidunt delectus deleniti omnis cum ipsa assumenda veritatis dolor provident voluptatibus, quisquam,
          laudantium illo! Explicabo molestias vel ea quia placeat, ducimus facere labore repellendus earum veniam
          voluptatibus soluta quos, temporibus dicta fugiat aut perferendis mollitia sapiente eaque laboriosam? Quidem
          earum porro fuga nesciunt blanditiis!
        </Text>
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
