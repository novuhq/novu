import { ActionIcon, Group, Title, useMantineTheme } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import { CSSProperties, ReactNode, useEffect } from 'react';
import styled from '@emotion/styled';

import { Button, colors, Text, Calendar, Close } from '@novu/design-system';
import { IS_SELF_HOSTED } from '../../config';
import { useAuth } from '../../hooks/useAuth';
import { useSegment } from '../providers/SegmentProvider';
import { When } from './When';

export enum ProductLeadVariants {
  DEFAULT = 'default',
  COLUMN = 'column',
}

const WrapperHolder = styled.div<{ variant: ProductLeadVariants }>`
  display: flex;
  flex-direction: ${({ variant }) => (variant === ProductLeadVariants.COLUMN ? 'column' : 'row')};
  justify-content: space-between;
  gap: 24px;
`;

export const ProductLead = ({
  title,
  text,
  closeable = true,
  icon = null,
  id,
  variant = ProductLeadVariants.DEFAULT,
  style = {},
}: {
  title: string;
  text: string;
  closeable?: boolean;
  icon?: ReactNode;
  id: string;
  variant?: ProductLeadVariants;
  style?: CSSProperties;
}) => {
  const [open, setOpen] = useLocalStorage<boolean>({
    key: id,
    defaultValue: true,
    getInitialValueInEffect: true,
  });
  const segment = useSegment();
  const theme = useMantineTheme();
  const dark = theme.colorScheme === 'dark';
  const isSelfHosted = IS_SELF_HOSTED;

  useEffect(() => {
    segment.track('Banner seen - [Product lead]', {
      feature: id,
    });
  }, [segment, id]);

  if (open === false) {
    return null;
  }

  return (
    <div
      style={{
        padding: 24,
        background: dark ? colors.B20 : colors.B98,
        borderRadius: 8,
        color: colors.B60,
        ...style,
      }}
    >
      <WrapperHolder variant={variant}>
        <div>
          <Group position="apart">
            <Group spacing={8}>
              {icon}
              <Title size={18} color={colors.B60}>
                {title}
              </Title>
            </Group>
            <When truthy={closeable && variant === ProductLeadVariants.COLUMN}>
              <ActionIcon
                variant={'transparent'}
                sx={{ transform: 'translate(14px, -14px)' }}
                onClick={() => {
                  setOpen(false);
                  segment.track('Banner hidden - [Product lead]', {
                    id,
                  });
                }}
              >
                <Close color={colors.B60} />
              </ActionIcon>
            </When>
          </Group>
          <Text mt={4} color={colors.B60}>
            {text}
          </Text>
        </div>
        <Group spacing={24} align="center">
          <Button
            onClick={() => {
              segment.track('Scheduled call clicked - [Product lead]', {
                feature: id,
              });
              window.open('https://notify.novu.co/meetings/novuhq/notifications-45min?utm_campaign=in-app');
            }}
            variant="outline"
          >
            <Group spacing={8}>
              <Calendar color={dark ? theme.white : colors.B60} /> Schedule a call
            </Group>
          </Button>
          <When truthy={closeable && variant === ProductLeadVariants.DEFAULT}>
            <ActionIcon
              variant={'transparent'}
              onClick={() => {
                setOpen(false);
                segment.track('Banner hidden - [Product lead]', {
                  feature: id,
                });
              }}
            >
              <Close color={colors.B60} />
            </ActionIcon>
          </When>
        </Group>
      </WrapperHolder>
    </div>
  );
};
