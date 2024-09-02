import styled from '@emotion/styled';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useFeatureFlag } from '../../../../hooks/useFeatureFlag';
import { ParsedPreviewStateType } from '../../../../pages/templates/hooks/usePreviewInAppTemplate';
import ContentOld from './Content';
import { Header } from './Header';
import { InboxPreviewContent } from './v2/InboxPreviewContent';

const ContainerStyled = styled.div<{ removePadding: boolean }>`
  width: 27.5rem;
  display: flex;
  margin: 1rem auto;
  flex-direction: column;
  gap: 1rem;

  ${({ removePadding }) => removePadding && `padding: 0;`}
`;
export const InAppBasePreview = ({
  content,
  loading = false,
  error,
  showEditOverlay = false,
  onLocaleChange,
  selectedLocale,
  locales = [],
  enableAvatar = false,
}: {
  content: ParsedPreviewStateType;
  loading?: boolean;
  error?: string;
  showEditOverlay?: boolean;
  onLocaleChange: (locale: string) => void;
  selectedLocale?: string;
  locales: any[];
  enableAvatar?: boolean;
}) => {
  const isV2Enabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_V2_ENABLED);

  return (
    <ContainerStyled removePadding={!showEditOverlay}>
      {isV2Enabled ? (
        <InboxPreviewContent isPreviewLoading={loading} parsedPreviewState={content} />
      ) : (
        <>
          <Header
            selectedLocale={selectedLocale}
            locales={locales}
            areLocalesLoading={loading}
            onLocaleChange={onLocaleChange}
          />
          <ContentOld
            isPreviewLoading={loading}
            parsedPreviewState={content}
            templateError={error || ''}
            showOverlay={showEditOverlay}
            enableAvatar={enableAvatar}
          />
        </>
      )}
    </ContainerStyled>
  );
};
