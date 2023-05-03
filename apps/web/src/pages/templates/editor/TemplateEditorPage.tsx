import { useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { ReactFlowProvider } from 'react-flow-renderer';
import { FieldErrors, useFormContext } from 'react-hook-form';

import PageContainer from '../../../components/layout/components/PageContainer';
import PageMeta from '../../../components/layout/components/PageMeta';
import type { IForm } from '../components/formTypes';
import WorkflowEditor from '../workflow/WorkflowEditor';
import { useEnvController, usePrompt } from '../../../hooks';
import { BlueprintModal } from '../components/BlueprintModal';
import { TemplateEditorFormProvider, useTemplateEditorForm } from '../components/TemplateEditorFormProvider';
import { errorMessage } from '../../../utils/notifications';
import { getExplicitErrors } from '../shared/errors';
import { ROUTES } from '../../../constants/routes.enum';
import { TourProvider } from './TourProvider';
import { NavigateValidatorModal } from '../components/NavigateValidatorModal';
import { useTourStorage } from '../hooks/useTourStorage';
import { useBasePath } from '../hooks/useBasePath';

function BaseTemplateEditorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { environment } = useEnvController();
  const { template, isCreating, onSubmit } = useTemplateEditorForm();
  const methods = useFormContext<IForm>();
  const { handleSubmit } = methods;
  const tourStorage = useTourStorage();
  const { templateId = '' } = useParams<{ templateId: string }>();
  const isTouring = tourStorage.getCurrentTour('digest', templateId) > -1;
  const basePath = useBasePath();

  const isCreateTemplatePage = location.pathname === ROUTES.TEMPLATES_CREATE;

  const onInvalid = async (errors: FieldErrors<IForm>) => {
    errorMessage(getExplicitErrors(errors));
  };

  const [showNavigateValidatorModal, confirmNavigate, cancelNavigate] = usePrompt(
    !methods.formState.isValid && location.pathname !== ROUTES.TEMPLATES_CREATE && !isTouring,
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
    if (environment && template) {
      if (environment._id !== template._environmentId) {
        if (template._parentId) {
          navigate(`/templates/edit/${template._parentId}`);
        } else {
          navigate(ROUTES.TEMPLATES);
        }
      }
    }
  }, [environment, template]);

  if (environment && environment?.name === 'Production' && isCreateTemplatePage) {
    navigate(ROUTES.TEMPLATES);
  }

  if (isCreating) return null;

  return (
    <>
      <TourProvider />
      <PageContainer>
        <PageMeta title={template?.name ?? 'Create Template'} />
        <form
          name="template-form"
          noValidate
          onSubmit={handleSubmit(onSubmitHandler, onInvalid)}
          style={{ minHeight: '100%' }}
        >
          <ReactFlowProvider>
            <WorkflowEditor />
          </ReactFlowProvider>
        </form>
      </PageContainer>
      <BlueprintModal />
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
