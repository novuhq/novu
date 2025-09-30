import { EnvironmentTypeEnum } from '@novu/shared';
import { AnimatedOutlet } from '@/components/animated-outlet';
import { DashboardLayout } from '@/components/dashboard-layout';
import { PageMeta } from '@/components/page-meta';
import { Badge } from '@/components/primitives/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { TranslationList } from '@/components/translations/translation-list';
import { useEnvironment } from '@/context/environment/hooks';

export const TranslationsPage = () => {
  const { currentEnvironment } = useEnvironment();
  const isDevEnvironment = currentEnvironment?.type === EnvironmentTypeEnum.DEV;

  return (
    <>
      <PageMeta title="Translations" />
      <DashboardLayout
        headerStartItems={
          <h1 className="text-foreground-950 flex items-center gap-1">
            Translations{' '}
            <Tooltip>
              <TooltipTrigger>
                <Badge color="gray" size="sm">
                  BETA
                </Badge>
              </TooltipTrigger>
              {!isDevEnvironment && (
                <TooltipContent>
                  <div className="max-w-xs">
                    <p className="font-medium">View-only mode</p>
                    <p className="mt-1 text-xs text-neutral-400">Edit translations in your development environment.</p>
                  </div>
                </TooltipContent>
              )}
            </Tooltip>
          </h1>
        }
      >
        <TranslationList />
        <AnimatedOutlet />
      </DashboardLayout>
    </>
  );
};
