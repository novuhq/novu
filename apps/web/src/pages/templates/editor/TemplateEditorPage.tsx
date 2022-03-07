import PageContainer from '../../../components/layout/components/PageContainer';
import PageHeader from '../../../components/layout/components/PageHeader';
import { TemplatesSideBar } from '../../../components/templates/TemplatesSideBar';

export default function TemplateEditorPage() {
  return (
    <PageContainer>
      <PageHeader title="Create New Template" />
      <TemplatesSideBar />
    </PageContainer>
  );
}
