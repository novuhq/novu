import { Divider, useMantineColorScheme } from '@mantine/core';
import { colors, Text } from '@novu/design-system';
import { useAuthController } from '@novu/shared-web';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { getLocalesFromContent } from '../../../../api/translations';
import { IForm } from '../../../../pages/templates/components/formTypes';
import { useStepFormErrors } from '../../../../pages/templates/hooks/useStepFormErrors';
import { useStepFormPath } from '../../../../pages/templates/hooks/useStepFormPath';
import { LocaleSelect } from '../common';
import { ChatContent } from './ChatContent';
import { ChatInput } from './ChatInput';
import { previewChat } from '../../../../api/content-templates';
import { errorMessage } from '../../../../utils/notifications';

export function ChatPreview() {
  const { organization } = useAuthController();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const [selectedLocale, onLocaleChange] = useState<string | undefined>(undefined);
  const { isLoading, mutateAsync } = useMutation(previewChat);
  const [compiledContent, setCompiledContent] = useState('');

  const {
    mutateAsync: translationLocales,
    data: locales,
    isLoading: isLoadingLocales,
  } = useMutation(getLocalesFromContent);

  const { control } = useFormContext<IForm>();
  const path = useStepFormPath();
  const error = useStepFormErrors();

  const content = useWatch({
    name: `${path}.template.content`,
    control,
  });

  useEffect(() => {
    onLocaleChange(organization?.defaultLocale);
  }, [organization?.defaultLocale]);

  useEffect(() => {
    if (content) {
      translationLocales({
        content,
      });
    }
  }, [content, translationLocales]);

  const parseContent = (args: { content?: string | any; payload: any; locale?: string }) => {
    mutateAsync({
      ...args,
      payload: JSON.parse(args.payload),
    })
      .then((result: { content: string }) => {
        setCompiledContent(result.content);

        return result;
      })
      .catch((e: any) => {
        errorMessage(e?.message || 'Un-expected error occurred');
      });
  };

  useEffect(() => {
    parseContent({
      content,
      payload: `{}`,
      locale: selectedLocale,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compiledContent, selectedLocale]);

  return (
    <div>
      <div>
        <LocaleSelect
          value={selectedLocale}
          onLocaleChange={onLocaleChange}
          isLoading={isLoadingLocales}
          locales={locales || []}
        />
      </div>
      <Divider
        color={isDark ? colors.B30 : colors.BGLight}
        label={
          <Text color={isDark ? colors.B30 : colors.BGLight} weight="bold">
            Today
          </Text>
        }
        labelPosition="center"
      />
      <ChatContent isLoading={isLoading || isLoadingLocales} content={compiledContent} error={error} />
      <ChatInput />
    </div>
  );
}
