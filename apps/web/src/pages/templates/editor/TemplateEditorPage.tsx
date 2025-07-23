import { useEffect, useState } from 'react';
import { useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { ReactFlowProvider } from 'react-flow-renderer';
import { useFormContext } from 'react-hook-form';

import { isBridgeWorkflow, ResourceTypeEnum } from '@novu/shared';
import PageContainer from '../../../components/layout/components/PageContainer';
import type { IForm } from '../components/formTypes';
import WorkflowEditor from '../workflow/WorkflowEditor';
import { useEnvironment, usePrompt } from '../../../hooks';
import { BlueprintModal } from '../components/BlueprintModal';
import { TemplateEditorFormProvider, useTemplateEditorForm } from '../components/TemplateEditorFormProvider';
import { ROUTES } from '../../../constants/routes';
import { TemplateDetailsPageV2 } from '../editor_v2/TemplateDetailsPageV2';
import { WorkflowDetailFormContextProvider } from '../../../studio/components/workflows/preferences/WorkflowDetailFormContextProvider';

function BaseTemplateEditorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { template, isCreating, onSubmit, onInvalid } = useTemplateEditorForm();
  const { environment } = useEnvironment({ bridge: template?.bridge });
  const methods = useFormContext<IForm>();
  const { handleSubmit } = methods;
  const [shouldRenderBlueprintModal, setShouldRenderBlueprintModal] = useState(false);

  const isCreateTemplatePage = location.pathname === ROUTES.WORKFLOWS_CREATE;

  const onSubmitHandler = async (data: IForm) => {
    await onSubmit(data);
  };

  useEffect(() => {
    if (environment && template && template._environmentId) {
      if (environment._id !== template._environmentId) {
        navigate(ROUTES.WORKFLOWS);
      }
    }
  }, [navigate, environment, template]);

  useEffect(() => {
    const id = localStorage.getItem('blueprintId');
    setShouldRenderBlueprintModal(!!id);
  }, []);

  if (environment && environment?.name === 'Production' && isCreateTemplatePage) {
    navigate(ROUTES.WORKFLOWS);
  }

  if (isCreating) return null;

  return (
    <>
      <PageContainer title={template?.name ?? 'Create Template'}>
        <form
          name="template-form"
          noValidate
          onSubmit={handleSubmit(onSubmitHandler, onInvalid)}
          style={{ height: '100%', display: 'grid', gridTemplateColumns: '1fr' }}
        >
          <ReactFlowProvider>
            <WorkflowEditor />
          </ReactFlowProvider>
        </form>
      </PageContainer>
      {shouldRenderBlueprintModal && <BlueprintModal />}
    </>
  );
}

export default function TemplateEditorPage() {
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type');

  if (!type || !isBridgeWorkflow(type as ResourceTypeEnum)) {
    return (
      <TemplateEditorFormProvider>
        <BaseTemplateEditorPage />
      </TemplateEditorFormProvider>
    );
  } else {
    return (
      <WorkflowDetailFormContextProvider>
        <TemplateDetailsPageV2 />
      </WorkflowDetailFormContextProvider>
    );
  }
}
