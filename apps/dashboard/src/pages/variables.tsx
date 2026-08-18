import { AnimatedOutlet } from '@/components/animated-outlet';
import { PageMeta } from '@/components/page-meta';
import { VariableList } from '@/components/variables/variable-list';
import { PageHeader } from '@/context/page-header';

export const VariablesPage = () => {
  return (
    <>
      <PageMeta title="Variables" />
      <PageHeader>
        <h1 className="text-foreground-950">Variables</h1>
      </PageHeader>
      <VariableList />
      <AnimatedOutlet />
    </>
  );
};
