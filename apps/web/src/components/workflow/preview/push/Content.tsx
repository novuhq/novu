import styled from '@emotion/styled';
import { Flex, Group, Skeleton, Stack, useMantineColorScheme } from '@mantine/core';
import { colors, Text } from '@novu/design-system';
import { useEffect, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useGetLocalesFromContent, usePreviewPush } from '../../../../api/hooks';
import { IS_DOCKER_HOSTED } from '../../../../config';
import { useAuthController, useDataRef, useProcessVariables } from '../../../../hooks';
import { IForm } from '../../../../pages/templates/components/formTypes';
import { usePreviewPushTemplate } from '../../../../pages/templates/hooks/usePreviewPushTemplate';
import { useStepFormCombinedErrors } from '../../../../pages/templates/hooks/useStepFormCombinedErrors';
import { useStepFormPath } from '../../../../pages/templates/hooks/useStepFormPath';
import { LocaleSelect, PreviewEditOverlay } from '../common';
import { NovuGreyIcon } from '../common/NovuGreyIcon';
import {
  ContentAndOVerlayWrapperStyled,
  ContentHeaderStyled,
  ContentStyled,
  ContentWrapperStyled,
} from './Content.styles';

export default function Content() {
  const [isEditOverlayVisible, setIsEditOverlayVisible] = useState(false);
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const { control } = useFormContext<IForm>();
  const path = useStepFormPath();
  const errorMsg = useStepFormCombinedErrors();

  const [selectedLocale, setSelectedLocale] = useState<string | undefined>(undefined);

  const title = useWatch({
    name: `${path}.template.title`,
    control,
  });

  const content = useWatch({
    name: `${path}.template.content`,
    control,
  });

  const variables = useWatch({
    name: `${path}.template.variables`,
    control,
  });

  const { organization } = useAuthController();

  const { isPreviewLoading, parsedPreviewState, templateError } = usePreviewPushTemplate(selectedLocale);

  const previewData = useDataRef({ content, title });

  const { data: locales, getLocalesFromContent, isLoading: isLocalesLoading } = useGetLocalesFromContent();

  useEffect(() => {
    if (!IS_DOCKER_HOSTED) {
      /*
       * combining title and content to get locales based upon variables in both title and content
       * The api is not concerned about the content type, it will parse the given string and return the locales
       */
      const combinedContent = `${previewData.current.title} ${previewData.current.content}`;
      getLocalesFromContent({
        content: combinedContent,
      });
    }
  }, [getLocalesFromContent, previewData]);

  useEffect(() => {
    setSelectedLocale(organization?.defaultLocale);
  }, [organization?.defaultLocale]);

  const onLocaleChange = (locale: string) => {
    setSelectedLocale(locale);
  };

  const handleMouseEnter = () => {
    setIsEditOverlayVisible(true);
  };

  const handleMouseLeave = () => {
    setIsEditOverlayVisible(false);
  };

  return (
    <ContentWrapperStyled>
      <Group>
        <LocaleSelect
          isLoading={isLocalesLoading}
          locales={locales || []}
          onLocaleChange={onLocaleChange}
          value={selectedLocale}
        />
      </Group>
      <ContentAndOVerlayWrapperStyled
        isError={!!errorMsg}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {isEditOverlayVisible && <PreviewEditOverlay />}
        <ContentStyled isBlur={isEditOverlayVisible}>
          {isPreviewLoading ? (
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

      {errorMsg && !isPreviewLoading && <Text color={colors.error}>{errorMsg}</Text>}
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
