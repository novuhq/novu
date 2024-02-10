import { Flex, Group, useMantineColorScheme } from '@mantine/core';
import { colors, Text } from '@novu/design-system';
import { useEffect, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useGetLocalesFromContent, usePreviewPush } from '../../../../api/hooks';
import { IS_DOCKER_HOSTED } from '../../../../config';
import { useAuthController, useDataRef, useProcessVariables } from '../../../../hooks';
import { IForm } from '../../../../pages/templates/components/formTypes';
import { useStepFormCombinedErrors } from '../../../../pages/templates/hooks/useStepFormCombinedErrors';
import { useStepFormErrors } from '../../../../pages/templates/hooks/useStepFormErrors';
import { useStepFormPath } from '../../../../pages/templates/hooks/useStepFormPath';
import { formatErrorMessage, mapStepErrors } from '../../../../pages/templates/shared/errors';
import { LocaleSelect } from '../common';
import { ContentHeaderStyled, ContentStyled, ContentWrapperStyled } from '../common/mobile/Mobile.styles';
import { NovuGreyIcon } from '../common/NovuGreyIcon';

export default function Content() {
  const [isEditOverlayVisible, setIsEditOverlayVisible] = useState(false);
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const { control } = useFormContext<IForm>();
  const path = useStepFormPath();
  const errorMsg = useStepFormCombinedErrors();

  const [selectedLocale, setSelectedLocale] = useState<string | undefined>(undefined);

  const [parsedPreviewState, setParsedPreviewState] = useState({
    title: '',
    content: '',
  });

  const { getPushPreview, isLoading } = usePreviewPush({
    onSuccess: (result) => {
      setParsedPreviewState({
        content: result.content,
        title: result.title,
      });
    },
  });

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
  const processedVariables = useProcessVariables(variables);

  const previewData = useDataRef({ content, title });

  const { data: locales, getLocalesFromContent } = useGetLocalesFromContent();

  useEffect(() => {
    getPushPreview({
      content: previewData.current.content,
      title: previewData.current.title,
      locale: selectedLocale,
      payload: processedVariables,
    });
  }, [getPushPreview, previewData, processedVariables, selectedLocale]);

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

  return (
    <ContentWrapperStyled>
      <Group>
        <LocaleSelect
          isLoading={false}
          locales={locales || []}
          onLocaleChange={onLocaleChange}
          value={selectedLocale}
        />
      </Group>
      <ContentStyled isError={!!errorMsg}>
        <ContentHeaderStyled>
          <Flex align="center" gap={5}>
            <NovuGreyIcon color={isDark ? colors.B30 : colors.BGLight} width="24px" height="24px" />
            <Text color={isDark ? colors.B30 : colors.BGLight} weight="bold">
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
      </ContentStyled>
      {errorMsg && <Text color={colors.error}>{errorMsg}</Text>}
    </ContentWrapperStyled>
  );
}
