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

const ChatPreviewContainer = styled.div`
  width: 100%;
  max-width: 37.5em;
`;

export function ChatPreview({ showLoading = false }: { showLoading?: boolean }) {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const { watch } = useFormContext<IForm>();
  const path = useStepFormPath();
  const content = watch(`${path}.template.content`);
  const { pathname } = useLocation();
  const isPreviewPath = pathname.endsWith('/preview');

  const { selectedLocale, locales, areLocalesLoading, onLocaleChange } = useTemplateLocales({
    content: content as string,
    disabled: showLoading,
  });

  const { isPreviewContentLoading, previewContent, templateError } = usePreviewChatTemplate({
    locale: selectedLocale,
    disabled: showLoading,
  });

  return (
    <ChatPreviewContainer>
      <Flex>
        <LocaleSelect
          value={selectedLocale}
          onLocaleChange={onLocaleChange}
          isLoading={areLocalesLoading || isPreviewContentLoading}
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
        isLoading={showLoading || isPreviewContentLoading || areLocalesLoading}
        content={previewContent}
        errorMsg={templateError}
      />
      <ChatInput />
    </ChatPreviewContainer>
  );
}
