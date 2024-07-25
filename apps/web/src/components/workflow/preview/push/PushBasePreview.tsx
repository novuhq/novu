import { Flex, Group, Skeleton, Stack, useMantineColorScheme } from '@mantine/core';
import styled from '@emotion/styled';
import { colors, Text } from '@novu/design-system';
import { useHover } from '../../../../hooks';
import {
  ContentAndOVerlayWrapperStyled,
  ContentHeaderStyled,
  ContentStyled,
  ContentWrapperStyled,
} from './Content.styles';
import { LocaleSelect, NovuGreyIcon, PreviewEditOverlay } from '../common';

const Skeletons = () => {
  return (
    <>
      <HeaderSkeleton />
      <ContentSkeleton />
    </>
  );
};
const HeaderSkeleton = () => {
  return (
    <Group position="apart" noWrap>
      <Group spacing={16} noWrap>
        <SkeletonStyled radius={6} height={24} width={24} />
        <SkeletonStyled height={14} width={80} radius={6} />
      </Group>
      <SkeletonStyled height={14} width={40} radius={6} />
    </Group>
  );
};
const ContentSkeleton = () => {
  return (
    <Stack spacing={10} w="100%">
      <SkeletonStyled height={14} width="70%" radius={6} />
      <SkeletonStyled height={14} width="35%" radius={6} />
    </Stack>
  );
};
const SkeletonStyled = styled(Skeleton)`
  &::before {
    background: rgba(0, 0, 0, 0.08);
  }

  &::after {
    background: rgba(0, 0, 0, 0.08);
  }
`;
export const PushBasePreview = ({
  content,
  title,
  loading = false,
  error,
  showEditOverlay = false,
  bridge = false,
  onLocaleChange,
  selectedLocale,
  locales = [],
}: {
  content: string;
  title: string;
  loading?: boolean;
  bridge?: boolean;
  error?: string;
  showEditOverlay?: boolean;
  onLocaleChange: (locale: string) => void;
  selectedLocale?: string;
  locales: any[];
}) => {
  const { isHovered, onMouseEnter, onMouseLeave } = useHover();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <ContentWrapperStyled>
      <Group>
        <LocaleSelect
          isLoading={loading}
          locales={locales || []}
          onLocaleChange={onLocaleChange}
          value={selectedLocale}
        />
      </Group>
      <ContentAndOVerlayWrapperStyled
        isError={!!error && !bridge}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {showEditOverlay && isHovered && <PreviewEditOverlay />}
        <ContentStyled isBlur={showEditOverlay && isHovered}>
          {loading ? (
            <Skeletons />
          ) : (
            <>
              <ContentHeaderStyled>
                <Flex align="center" gap={5}>
                  <NovuGreyIcon color={isDark ? colors.B30 : '#1F1F27'} width="24px" height="24px" />
                  <Text color={colors.B20} weight="bold">
                    Your App
                  </Text>
                </Flex>
                <Text color={colors.B60}>now</Text>
              </ContentHeaderStyled>
              <div>
                <Text color={colors.B15} weight="bold" rows={1}>
                  {title}
                </Text>
                <Text color={colors.B15} rows={3}>
                  {content}
                </Text>
              </div>
            </>
          )}
        </ContentStyled>
      </ContentAndOVerlayWrapperStyled>

      {error && !bridge && !loading && <Text color={colors.error}>{error}</Text>}
    </ContentWrapperStyled>
  );
};
