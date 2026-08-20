import { AnimatedOutlet } from '@/components/animated-outlet';
import { PageMeta } from '@/components/page-meta';
import { TranslationList } from '@/components/translations/translation-list';
import { PageHeader } from '@/context/page-header';

export const TranslationsPage = () => {
  return (
    <>
      <PageMeta title="Translations" />
      <PageHeader>
        <h1 className="text-foreground-950 flex items-center gap-1">Translations</h1>
      </PageHeader>
      <TranslationList />
      <AnimatedOutlet />
    </>
  );
};
