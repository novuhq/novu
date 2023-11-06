import styled from '@emotion/styled';
import { Skeleton, useMantineColorScheme } from '@mantine/core';
import { useState } from 'react';

import { colors, IExtendedCellProps, Popover, Text, Star } from '@novu/design-system';
import type { ITableIntegration } from '../types';
import { ChannelTypeEnum } from '@novu/shared';

const CellHolder = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const NameHolder = styled.div`
  display: flex;
  gap: 8px;
`;

const DetailsHolder = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Free = styled.span`
  color: ${colors.success};
  font-size: 14px;
  min-width: fit-content;
`;

const Identifier = styled.span`
  color: ${colors.B40};
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
`;

const IconHolder = styled.div`
  position: relative;
  display: flex;
`;

const Image = styled.img`
  width: 24px;
  min-width: 24px;
  height: 24px;
`;

const Description = styled(Text)`
  color: ${colors.B60};
  font-size: 14px;
  line-height: 20px;
`;

export const IntegrationNameCell = ({ row: { original }, isLoading }: IExtendedCellProps<ITableIntegration>) => {
  const { colorScheme } = useMantineColorScheme();
  const [isPopoverOpened, setPopoverOpened] = useState(false);

  if (isLoading) {
    return (
      <CellHolder data-test-id="integration-name-cell-loading">
        <Skeleton width={24} height={24} />
        <DetailsHolder>
          <NameHolder>
            <Skeleton width={120} height={18} />
          </NameHolder>
          <Skeleton width={100} height={14} />
        </DetailsHolder>
      </CellHolder>
    );
  }

  return (
    <CellHolder data-test-id="integration-name-cell">
      <Popover
        opened={isPopoverOpened && original.primary}
        withArrow
        withinPortal
        offset={10}
        transitionDuration={300}
        position="top"
        width={230}
        styles={{ dropdown: { minHeight: 'initial !important' } }}
        content={
          <Description>
            {`The primary provider instance within the ${original.channel.toLowerCase()} ` +
              `channel in the ${original.environment.toLowerCase()} environment.`}
          </Description>
        }
        target={
          <IconHolder onMouseEnter={() => setPopoverOpened(true)} onMouseLeave={() => setPopoverOpened(false)}>
            <Image src={original.logoFileName[`${colorScheme}`]} alt={original.name} />
            {original.primary && <Star data-test-id="integration-name-cell-primary" />}
          </IconHolder>
        }
      />

      <DetailsHolder>
        <NameHolder>
          <Text rows={1}>{original.name}</Text>
          {original.name?.toLowerCase().includes('novu') && original.channelType !== ChannelTypeEnum.IN_APP && (
            <Free>Test Provider</Free>
          )}
        </NameHolder>
        {original.identifier && <Identifier>Provider identifier: {original.identifier}</Identifier>}
      </DetailsHolder>
    </CellHolder>
  );
};
