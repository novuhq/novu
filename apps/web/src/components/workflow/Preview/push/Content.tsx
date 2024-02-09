import { Flex, Group, useMantineColorScheme } from '@mantine/core';
import { colors, Text } from '@novu/design-system';
import React, { useState } from 'react';
import { NovuGreyIcon } from '../common/NovuGreyIcon';
import { ContentHeaderStyled, ContentStyled, ContentWrapperStyled } from '../common/mobile/Mobile.styles';
import { LocaleSelect } from '../common';
import { useFormContext, useWatch } from 'react-hook-form';
import { IForm } from '../../../../pages/templates/components/formTypes';
import { useStepFormErrors } from '../../../../pages/templates/hooks/useStepFormErrors';
import { useStepFormPath } from '../../../../pages/templates/hooks/useStepFormPath';

export default function Content() {
  const [isEditOverlayVisible, setIsEditOverlayVisible] = useState(false);
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const { control } = useFormContext<IForm>();
  const path = useStepFormPath();
  const error = useStepFormErrors();

  const [parsedPreviewState, setParsedPreviewState] = useState({
    title: '',
    content: '',
  });

  const title = useWatch({
    name: `${path}.template.title`,
    control,
  });

  const content = useWatch({
    name: `${path}.template.content`,
    control,
  });

  return (
    <ContentWrapperStyled>
      <div
        style={{
          width: '100px',
        }}
      >
        <LocaleSelect isLoading={false} locales={[]} onLocaleChange={() => {}} value="hi_IN" />
      </div>
      <ContentStyled>
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
          <Text color={colors.B15} weight="bold">
            {title || ''}
          </Text>
          <Text color={colors.B15} rows={3}>
            {content}
          </Text>
        </div>
      </ContentStyled>
    </ContentWrapperStyled>
  );
}
