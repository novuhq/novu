import styled from '@emotion/styled';
import { ParsedPreviewStateType } from '../../../../pages/templates/hooks/usePreviewInAppTemplate';
import { ErrorPrettyRender } from '../ErrorPrettyRender';
import { Header } from './Header';
import Content from './Content';

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
  previewError,
  showEditOverlay = false,
  onLocaleChange,
  selectedLocale,
  locales = [],
  enableAvatar = false,
}: {
  content: ParsedPreviewStateType;
  loading?: boolean;
  error?: string;
  previewError?: any;
  showEditOverlay?: boolean;
  onLocaleChange: (locale: string) => void;
  selectedLocale?: string;
  locales: any[];
  enableAvatar?: boolean;
}) => {
  if (previewError) {
    return <ErrorPrettyRender error={previewError} />;
  }

  return (
    <ContainerStyled removePadding={!showEditOverlay}>
      <Header
        selectedLocale={selectedLocale}
        locales={locales}
        areLocalesLoading={loading}
        onLocaleChange={onLocaleChange}
      />
      <Content
        isPreviewLoading={loading}
        parsedPreviewState={content}
        templateError={error || ''}
        showOverlay={showEditOverlay}
        enableAvatar={enableAvatar}
      />
    </ContainerStyled>
  );
};
