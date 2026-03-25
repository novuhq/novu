import { FeatureFlagsKeysEnum } from '@novu/shared';
import { Navigate } from 'react-router-dom';
import { AnimatedOutlet } from '@/components/animated-outlet';
import { DashboardLayout } from '@/components/dashboard-layout';
import { PageMeta } from '@/components/page-meta';
import { VariableList } from '@/components/variables/variable-list';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { ROUTES } from '@/utils/routes';

export const VariablesPage = () => {
  const isVariablesPageEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_VARIABLES_PAGE_ENABLED, false);

  if (!isVariablesPageEnabled) {
    return <Navigate to={ROUTES.WORKFLOWS} replace />;
  }

  return (
    <>
      <PageMeta title="Variables" />
      <DashboardLayout headerStartItems={<h1 className="text-foreground-950">Variables</h1>}>
        <VariableList />
        <AnimatedOutlet />
      </DashboardLayout>
    </>
  );
};
