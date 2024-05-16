import { Sidebar } from '@novu/design-system';
import { StepTypeEnum } from '@novu/shared';
import { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useFormContext } from 'react-hook-form';
import { useBasePath } from '../hooks/useBasePath';
import { useNavigateToVariantPreview } from '../hooks/useNavigateToVariantPreview';
import { useStepIndex } from '../hooks/useStepIndex';
import { useStepVariantsCount } from '../hooks/useStepVariantsCount';
import { EditorSidebarHeaderActions } from './EditorSidebarHeaderActions';
import { IForm } from './formTypes';
import { StepName } from './StepName';
import { useTemplateEditorForm } from './TemplateEditorFormProvider';

const StepSidebarHeader = () => {
  const { channel } = useParams<{
    channel: StepTypeEnum;
  }>();

  if (!channel) {
    return null;
  }

  return (
    <div style={{ display: 'flex', width: '100%', gap: 12 }}>
      <StepName channel={channel} />
      <EditorSidebarHeaderActions />
    </div>
  );
};

export const StepEditorSidebar = ({ children }: { children: ReactNode }) => {
  const { channel, stepUuid } = useParams<{
    channel: StepTypeEnum;
    stepUuid: string;
  }>();
  const navigate = useNavigate();
  const basePath = useBasePath();
  const { navigateToVariantPreview } = useNavigateToVariantPreview();
  const { onSubmit, onInvalid } = useTemplateEditorForm();
  const methods = useFormContext<IForm>();
  const { handleSubmit } = methods;
  const { stepIndex, variantIndex } = useStepIndex();
  const { variantsCount } = useStepVariantsCount();
  const key = `${stepIndex}_${variantIndex}`;
  const isExpandedChannel = [
    StepTypeEnum.IN_APP,
    StepTypeEnum.EMAIL,
    StepTypeEnum.CHAT,
    StepTypeEnum.SMS,
    StepTypeEnum.PUSH,
  ].includes(channel as StepTypeEnum);

  const onSubmitHandler = async (data: IForm) => {
    await onSubmit(data);
  };

  return (
    <Sidebar
      key={key}
      isOpened
      isExpanded={isExpandedChannel}
      customHeader={<StepSidebarHeader />}
      isParentScrollable={isExpandedChannel}
      onClose={() => {
        if (variantsCount > 0) {
          navigateToVariantPreview({ variantUuid: stepUuid });

          return;
        }
        navigate(basePath);
      }}
      data-test-id="step-editor-sidebar"
      onSubmit={handleSubmit(onSubmitHandler, onInvalid)}
    >
      {children}
    </Sidebar>
  );
};
