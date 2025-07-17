import { AnimatedOutlet } from '@/components/animated-outlet';
import { DashboardLayout } from '@/components/dashboard-layout';
import { TranslationList } from '@/components/translations/translation-list';
import { PageMeta } from '@/components/page-meta';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { ROUTES } from '@/utils/routes';
import { Navigate } from 'react-router-dom';
import { Badge } from '@/components/primitives/badge';

export const TranslationsPage = () => {
  const isTranslationEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_TRANSLATION_ENABLED, false);

  if (!isTranslationEnabled) {
    return <Navigate to={ROUTES.WORKFLOWS} />;
  }

  return (
    <>
      <PageMeta title="Translations" />
      <DashboardLayout
        headerStartItems={
          <h1 className="text-foreground-950 flex items-center gap-1">
            Translations{' '}
            <Badge color="gray" size="sm">
              BETA
            </Badge>
          </h1>
        }
      >
        <TranslationList className="px-2.5" />
        <AnimatedOutlet />
      </DashboardLayout>
    </>
  );
};
