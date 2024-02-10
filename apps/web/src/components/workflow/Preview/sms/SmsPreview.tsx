import styled from '@emotion/styled';
import { colors } from '@novu/design-system';
import { ChannelTypeEnum } from '@novu/shared';
import { useAuthController, useDataRef } from '@novu/shared-web';

import { useEffect, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { useGetLocalesFromContent, usePreviewSms } from '../../../../api/hooks';
import { IForm } from '../../../../pages/templates/components/formTypes';
import { useNavigateToStepEditor } from '../../../../pages/templates/hooks/useNavigateToStepEditor';
import { useStepFormCombinedErrors } from '../../../../pages/templates/hooks/useStepFormCombinedErrors';
import { useStepFormPath } from '../../../../pages/templates/hooks/useStepFormPath';
import { LocaleSelect, MobileSimulator } from '../common';
import { SmsBubble } from './SmsBubble';

const BodyContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  margin: auto 20px 40px 20px;
`;

const LocaleSelectStyled = styled(LocaleSelect)`
  .mantine-Select-input {
    color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.white : colors.B60)};
  }

  .mantine-Input-rightSection {
    color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.white : colors.B60)} !important;
  }
`;

export const SmsPreview = () => {
  const { control } = useFormContext<IForm>();
  const path = useStepFormPath();

  const templateContentError = useStepFormCombinedErrors();
  const templateContent = useWatch({
    name: `${path}.template.content`,
    control,
  });
  const { organization } = useAuthController();
  const [previewContent, setPreviewContent] = useState(templateContent as string);
  const [selectedLocale, setSelectedLocale] = useState('');
  const previewData = useDataRef({ templateContent });

  const { data: locales, isLoading: areLocalesLoading, getLocalesFromContent } = useGetLocalesFromContent();
  const { isLoading: isPreviewContentLoading, getSmsPreview } = usePreviewSms({
    onSuccess: (result) => {
      setPreviewContent(result.content);
    },
  });

  const { navigateToStepEditor } = useNavigateToStepEditor();

  useEffect(() => {
    getLocalesFromContent({
      content: previewData.current.templateContent,
    });
  }, [getLocalesFromContent, previewData]);

  useEffect(() => {
    getSmsPreview({
      content: previewData.current.templateContent,
      payload: '',
      locale: selectedLocale,
    });
  }, [selectedLocale, previewData, getSmsPreview]);

  const onLocaleChange = (locale) => {
    setSelectedLocale(locale);
  };

  const isBubbleLoading = !templateContentError && isPreviewContentLoading;

  return (
    <MobileSimulator channel={ChannelTypeEnum.SMS}>
      <BodyContainer>
        <LocaleSelectStyled
          isLoading={areLocalesLoading}
          locales={locales}
          value={selectedLocale || organization?.defaultLocale}
          onLocaleChange={onLocaleChange}
          dropdownPosition="top"
        />
        <SmsBubble
          onEditClick={navigateToStepEditor}
          isLoading={isBubbleLoading}
          text={previewContent}
          error={templateContentError}
        />
      </BodyContainer>
    </MobileSimulator>
  );
};
