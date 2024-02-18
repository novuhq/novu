import React from 'react';
import { Card, Grid, Group } from '@mantine/core';
import styled from '@emotion/styled';
import { CONTEXT_PATH } from '../../../config';

import { colors, Text } from '@novu/design-system';

export const TriggerCard = ({
  name,
  title,
  exist = false,
  onClick,
  opened = false,
}: {
  name: string;
  title: string;
  exist?: boolean;
  onClick?: () => void;
  opened?: boolean;
}) => {
  return (
    <Grid.Col span={3}>
      <Card
        withBorder
        onClick={onClick}
        sx={(theme) => {
          const darkBorderColor = opened ? colors.white : colors.B30;
          const lightBorderColor = opened ? colors.B40 : colors.B80;

          return {
            minHeight: '115px',
            backgroundColor: 'transparent',
            borderColor: theme.colorScheme === 'dark' ? darkBorderColor : lightBorderColor,
            ...(exist && {
              cursor: 'pointer',
              ['&:hover']: {
                borderColor: theme.colorScheme === 'dark' ? colors.white : colors.B40,
              },
            }),
          };
        }}
      >
        {!exist && (
          <RibbonWrapper>
            <ComingSoonRibbon>COMING SOON</ComingSoonRibbon>
          </RibbonWrapper>
        )}
        <StyledCardContent>
          <Logo src={CONTEXT_PATH + `/static/images/triggers/${name}.svg`} alt={name} />
          <Text color={colors.B60}>{title}</Text>
        </StyledCardContent>
      </Card>
    </Grid.Col>
  );
};

const StyledCardContent = ({ children }: { children: React.ReactNode }) => {
  return (
    <Group
      align="center"
      spacing={7}
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginRight: '-50%',
        transform: 'translate(-50%, -50%)',
        flexDirection: 'column',
      }}
    >
      {children}
    </Group>
  );
};

const RibbonWrapper = styled.div`
  width: 115px;
  height: 115px;
  position: absolute;
  right: 5px;
  top: 5px;
  transform: rotate(45deg);
`;

const ComingSoonRibbon = styled.div`
  background: ${colors.horizontal};
  color: ${colors.white};
  font-size: 9px;
  width: 100%;
  text-align: center;
  line-height: 20px;
  font-weight: bold;
`;

const Logo = styled.img`
  max-width: 140px;
  max-height: 50px;
  svg {
    fill: red !important;
    color: red;
  }
`;
