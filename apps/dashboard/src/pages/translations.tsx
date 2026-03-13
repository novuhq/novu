import { AnimatedOutlet } from '@/components/animated-outlet';
import { DashboardLayout } from '@/components/dashboard-layout';
import { PageMeta } from '@/components/page-meta';
import { TranslationList } from '@/components/translations/translation-list';

export const TranslationsPage = () => {
  return (
    <>
      <PageMeta title="Translations" />
      <DashboardLayout
        headerStartItems={<h1 className="text-foreground-950 flex items-center gap-1">Translations</h1>}
      >
        <TranslationList />
        <AnimatedOutlet />
      </DashboardLayout>
    </>
  );
};
