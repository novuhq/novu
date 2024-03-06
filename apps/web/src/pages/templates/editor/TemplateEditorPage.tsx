import { useEffect, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { ReactFlowProvider } from 'react-flow-renderer';
import { useFormContext } from 'react-hook-form';

import PageContainer from '../../../components/layout/components/PageContainer';
import type { IForm } from '../components/formTypes';
import WorkflowEditor from '../workflow/WorkflowEditor';
import { useEnvController, usePrompt } from '../../../hooks';
import { BlueprintModal } from '../components/BlueprintModal';
import { TemplateEditorFormProvider, useTemplateEditorForm } from '../components/TemplateEditorFormProvider';
import { ROUTES } from '../../../constants/routes.enum';
import { TourProvider } from './TourProvider';
import { NavigateValidatorModal } from '../components/NavigateValidatorModal';
import { useTourStorage } from '../hooks/useTourStorage';
import { useBasePath } from '../hooks/useBasePath';

function BaseTemplateEditorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { template, isCreating, onSubmit, onInvalid } = useTemplateEditorForm();
  const { environment, chimera } = useEnvController({}, template?.chimera);
  const methods = useFormContext<IForm>();
  const { handleSubmit } = methods;
  const tourStorage = useTourStorage();
  const { templateId = '' } = useParams<{ templateId: string }>();
  const isTouring = tourStorage.getCurrentTour('digest', templateId) > -1;
  const basePath = useBasePath();
  const [shouldRenderBlueprintModal, setShouldRenderBlueprintModal] = useState(false);

  const isCreateTemplatePage = location.pathname === ROUTES.WORKFLOWS_CREATE;

  const [showNavigateValidatorModal, confirmNavigate, cancelNavigate] = usePrompt(
    !methods.formState.isValid && !chimera && location.pathname !== ROUTES.WORKFLOWS_CREATE && !isTouring,
    (nextLocation) => {
      if (nextLocation.location.pathname.includes(basePath)) {
        nextLocation.retry();

        return false;
      }

      return true;
    }
  );

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
      {!chimera && <TourProvider />}

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
      <NavigateValidatorModal
        isOpen={showNavigateValidatorModal}
        onConfirm={confirmNavigate}
        onCancel={cancelNavigate}
      />
    </>
  );
}

export default function TemplateEditorPage() {
  return (
    <TemplateEditorFormProvider>
      <BaseTemplateEditorPage />
    </TemplateEditorFormProvider>
  );
}
