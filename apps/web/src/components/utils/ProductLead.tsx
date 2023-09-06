import { ActionIcon, Group, Title, useMantineTheme } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import { CSSProperties, ReactNode, useEffect } from 'react';
import { IS_DOCKER_HOSTED } from '../../config';
import { Button, colors, Text } from '../../design-system';
import { Calendar, Close } from '../../design-system/icons';
import { useAuthContext } from '../providers/AuthProvider';
import { useSegment } from '../providers/SegmentProvider';
import { When } from './When';

export enum ProductLeadVariants {
  DEFAULT = 'default',
  COLUMN = 'column',
}

const Wrapper = ({ children, variant, id }: { children: any; variant: ProductLeadVariants; id: string }) => {
  const segment = useSegment();

  useEffect(() => {
    segment.track('Banner seen - [Product lead]', {
      id,
    });
  }, []);

  return variant === ProductLeadVariants.COLUMN ? (
    <Group position="apart" align="center">
      {children}
    </Group>
  ) : (
    children
  );
};

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
  const { currentUser } = useAuthContext();
  const [open, setOpen] = useLocalStorage<boolean>({
    key: id,
    defaultValue: true,
    getInitialValueInEffect: true,
  });

  const theme = useMantineTheme();
  const dark = theme.colorScheme === 'dark';
  const isSelfHosted = IS_DOCKER_HOSTED;
  const segment = useSegment();

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
      <Wrapper variant={variant} id={id}>
        <div>
          <Group position="apart">
            <Group spacing={8}>
              {icon}
              <Title size={18} color={colors.B60}>
                {title}
              </Title>
            </Group>
            <When truthy={closeable && variant === ProductLeadVariants.DEFAULT}>
              <ActionIcon
                variant={'transparent'}
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
        <Group spacing={24}>
          <Button
            mt={variant === ProductLeadVariants.DEFAULT ? 16 : undefined}
            onClick={() => {
              segment.track('Scheduled call clicked - [Product lead]', {
                feature: id,
              });
              window.open(
                `https://calendly.com/novuhq/novu-meeting?full_name=${currentUser?.firstName}&email=${
                  currentUser?.email
                }&utm_campaign=${id}&utm_source=${isSelfHosted ? 'self-hosted' : 'cloud'}`
              );
            }}
            variant="outline"
          >
            <Group spacing={8}>
              <Calendar color={dark ? theme.white : colors.B60} /> Schedule a call
            </Group>
          </Button>
          <When truthy={closeable && variant === ProductLeadVariants.COLUMN}>
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
      </Wrapper>
    </div>
  );
};
