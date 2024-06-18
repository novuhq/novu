import styled from '@emotion/styled';
import { Flex, Group, Skeleton, Stack, useMantineColorScheme } from '@mantine/core';
import { colors, Text } from '@novu/design-system';
import { api } from '../../../../api';
import { useEnvController } from '../../../../hooks/useEnvController';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';

import { useHover } from '../../../../hooks';
import { IForm } from '../../../../pages/templates/components/formTypes';
import { useTemplateEditorForm } from '../../../../pages/templates/components/TemplateEditorFormProvider';
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
import { ErrorPrettyRender } from '../ErrorPrettyRender';

export default function Content({
  showLoading = false,
  showOverlay = true,
  inputVariables,
}: {
  showLoading?: boolean;
  showOverlay?: boolean;
  inputVariables?: any;
}) {
  const { template } = useTemplateEditorForm();
  const { bridge } = useEnvController({}, template?.bridge);

  const { watch, formState } = useFormContext<IForm>();
  const path = useStepFormPath();

  const stepId = watch(`${path}.uuid`);
  const title = watch(`${path}.template.title`);
  const content = watch(`${path}.template.content`);
  const [bridgeContent, setBridgeContent] = useState('');
  const [bridgeSubject, setBridgeSubject] = useState('');

  const {
    mutateAsync,
    isLoading: isBridgeLoading,
    error: previewError,
  } = useMutation((data) => api.post('/v1/echo/preview/' + formState?.defaultValues?.identifier + '/' + stepId, data), {
    onSuccess(data) {
      setBridgeContent(data.outputs.body);
      setBridgeSubject(data.outputs.subject);
    },
  });

  const { selectedLocale, locales, areLocalesLoading, onLocaleChange } = useTemplateLocales({
    content: content as string,
    title: title,
    disabled: showLoading || bridge,
  });

  const { isPreviewLoading, parsedPreviewState, templateError } = usePreviewPushTemplate({
    disabled: showLoading || bridge,
    locale: selectedLocale,
  });

  useEffect(() => {
    if (bridge) {
      mutateAsync(inputVariables);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bridge, inputVariables]);

  return (
    <PushPreviewComponent
      content={parsedPreviewState.content || bridgeContent || ''}
      title={parsedPreviewState.title || bridgeSubject || ''}
      locales={locales || []}
      selectedLocale={selectedLocale}
      onLocaleChange={onLocaleChange}
      showEditOverlay={showOverlay}
      bridge={bridge}
      error={templateError}
      previewError={previewError}
      loading={isPreviewLoading || isBridgeLoading || showLoading || areLocalesLoading}
    />
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

export const PushPreviewComponent = ({
  content,
  title,
  loading = false,
  error,
  previewError,
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
  previewError?: any;
  showEditOverlay?: boolean;
  onLocaleChange: (locale: string) => void;
  selectedLocale?: string;
  locales: any[];
}) => {
  const { isHovered, onMouseEnter, onMouseLeave } = useHover();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  if (previewError) {
    return (
      <div style={{ marginTop: 20, padding: 10 }}>
        <ErrorPrettyRender error={previewError} />
      </div>
    );
  }

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
