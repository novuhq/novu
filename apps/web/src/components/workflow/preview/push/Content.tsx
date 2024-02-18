import styled from '@emotion/styled';
import { Flex, Group, Skeleton, Stack, useMantineColorScheme } from '@mantine/core';
import { colors, Text } from '@novu/design-system';
import { useFormContext } from 'react-hook-form';

import { useHover } from '../../../../hooks';
import { IForm } from '../../../../pages/templates/components/formTypes';
import { usePreviewPushTemplate } from '../../../../pages/templates/hooks/usePreviewPushTemplate';
import { useStepFormPath } from '../../../../pages/templates/hooks/useStepFormPath';
import { useTemplateLocales } from '../../../../pages/templates/hooks/useTemplateLocales';
import { LocaleSelect, PreviewEditOverlay } from '../common';
import { NovuGreyIcon } from '../common/NovuGreyIcon';
import {
  ContentAndOVerlayWrapperStyled,
  ContentHeaderStyled,
  ContentStyled,
  ContentWrapperStyled,
} from './Content.styles';

export default function Content({
  showLoading = false,
  showOverlay = true,
}: {
  showLoading?: boolean;
  showOverlay?: boolean;
}) {
  const { isHovered, onMouseEnter, onMouseLeave } = useHover();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const { watch } = useFormContext<IForm>();
  const path = useStepFormPath();

  const title = watch(`${path}.template.title`);
  const content = watch(`${path}.template.content`);

  const { selectedLocale, locales, areLocalesLoading, onLocaleChange } = useTemplateLocales({
    content: content as string,
    title: title,
    disabled: showLoading,
  });

  const { isPreviewLoading, parsedPreviewState, templateError } = usePreviewPushTemplate({
    disabled: showLoading,
    locale: selectedLocale,
  });

  return (
    <ContentWrapperStyled>
      <Group>
        <LocaleSelect
          isLoading={areLocalesLoading}
          locales={locales || []}
          onLocaleChange={onLocaleChange}
          value={selectedLocale}
        />
      </Group>
      <ContentAndOVerlayWrapperStyled isError={!!templateError} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
        {showOverlay && isHovered && <PreviewEditOverlay />}
        <ContentStyled isBlur={showOverlay && isHovered}>
          {isPreviewLoading || showLoading ? (
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
                  {parsedPreviewState.title || ''}
                </Text>
                <Text color={colors.B15} rows={3}>
                  {parsedPreviewState.content || ''}
                </Text>
              </div>
            </>
          )}
        </ContentStyled>
      </ContentAndOVerlayWrapperStyled>

      {templateError && !isPreviewLoading && !showLoading && <Text color={colors.error}>{templateError}</Text>}
    </ContentWrapperStyled>
  );
}

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
