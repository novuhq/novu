import { Divider } from '@mantine/core';
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

export function ChatPreview() {
  const { organization } = useAuthController();
  const [selectedLocale, setSelectedLocale] = useState<string | undefined>(undefined);
  const { mutateAsync: translationLocales, data: locales } = useMutation(getLocalesFromContent);

  const { control } = useFormContext<IForm>();
  const path = useStepFormPath();
  const error = useStepFormErrors();

  const content = useWatch({
    name: `${path}.template.content`,
    control,
  });

  useEffect(() => {
    setSelectedLocale(organization?.defaultLocale);
  }, [organization?.defaultLocale]);

  useEffect(() => {
    if (content) {
      translationLocales({
        content,
      });
    }
  }, [content, translationLocales]);

  return (
    <div>
      <div>
        <LocaleSelect
          value={selectedLocale}
          setSelectedLocale={selectedLocale}
          isLoading={false}
          locales={locales || []}
        />
      </div>
      <Divider
        label={
          <Text color={colors.B30} weight="bold">
            Today
          </Text>
        }
        labelPosition="center"
      />
      <ChatContent content={content} error={error} />
      <ChatInput />
    </div>
  );
}
