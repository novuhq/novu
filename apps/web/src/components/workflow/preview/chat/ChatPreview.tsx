import styled from '@emotion/styled';
import { Divider, Flex, useMantineColorScheme } from '@mantine/core';
import { colors, Text } from '@novu/design-system';
import { useFormContext } from 'react-hook-form';
import { useLocation } from 'react-router-dom';

import { IForm } from '../../../../pages/templates/components/formTypes';
import { useStepFormPath } from '../../../../pages/templates/hooks/useStepFormPath';
import { LocaleSelect } from '../common';
import { ChatContent } from './ChatContent';
import { ChatInput } from './ChatInput';
import { useTemplateLocales } from '../../../../pages/templates/hooks/useTemplateLocales';
import { usePreviewChatTemplate } from '../../../../pages/templates/hooks/usePreviewChatTemplate';
import { useEffect, useState } from 'react';
import { api, useEnvController } from '@novu/shared-web';
import { useMutation } from '@tanstack/react-query';
import { useTemplateEditorForm } from '../../../../pages/templates/components/TemplateEditorFormProvider';
import { ErrorPrettyRender } from '../ErrorPrettyRender';

const ChatPreviewContainer = styled.div`
  width: 100%;
  max-width: 37.5em;
`;

export function ChatPreview({ showLoading = false, inputVariables }: { showLoading?: boolean; inputVariables?: any }) {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const { watch, formState } = useFormContext<IForm>();
  const { template } = useTemplateEditorForm();
  const { chimera } = useEnvController({}, template?.chimera);
  const path = useStepFormPath();
  const content = watch(`${path}.template.content`);
  const { pathname } = useLocation();
  const isPreviewPath = pathname.endsWith('/preview');
  const stepId = watch(`${path}.uuid`);
  const [chimeraContent, setChimeraContent] = useState('');

  const {
    mutateAsync,
    isLoading: isChimeraLoading,
    error: previewError,
  } = useMutation((data) => api.post('/v1/echo/preview/' + formState?.defaultValues?.identifier + '/' + stepId, data), {
    onSuccess(data) {
      setChimeraContent(data.outputs.body);
    },
  });

  useEffect(() => {
    if (chimera) {
      mutateAsync(inputVariables);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chimera, inputVariables]);

  const { selectedLocale, locales, areLocalesLoading, onLocaleChange } = useTemplateLocales({
    content: content as string,
    disabled: showLoading || chimera,
  });

  const { isPreviewContentLoading, previewContent, templateError } = usePreviewChatTemplate({
    locale: selectedLocale,
    disabled: showLoading || chimera,
  });

  if (previewError) {
    return <ErrorPrettyRender error={previewError} />;
  }

  return (
    <ChatPreviewContainer>
      <Flex>
        <LocaleSelect
          value={selectedLocale}
          onLocaleChange={onLocaleChange}
          isLoading={areLocalesLoading || isPreviewContentLoading || isChimeraLoading}
          locales={locales || []}
        />
      </Flex>
      <Divider
        color={isDark ? colors.B30 : colors.BGLight}
        label={
          <Text color={isDark ? colors.B30 : colors.BGLight} weight="bold">
            Today
          </Text>
        }
        labelPosition="center"
      />
      <ChatContent
        showOverlay={isPreviewPath}
        isLoading={showLoading || isPreviewContentLoading || areLocalesLoading || isChimeraLoading}
        content={previewContent || chimeraContent}
        errorMsg={chimera ? undefined : templateError}
      />
      <ChatInput />
    </ChatPreviewContainer>
  );
}
