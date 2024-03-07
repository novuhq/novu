import { Group } from '@mantine/core';
import { useEffect, useRef, useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { FilterPartTypeEnum, DELAYED_STEPS, StepTypeEnum } from '@novu/shared';
import { ActionButton, Condition, ConditionPlus, Trash, VariantPlus } from '@novu/design-system';

import { Conditions, IConditions } from '../../../components/conditions';
import { When } from '../../../components/utils/When';
import { useEnvController } from '../../../hooks';
import { useBasePath } from '../hooks/useBasePath';
import { useFilterPartsList } from '../hooks/useFilterPartsList';
import { useStepFormPath } from '../hooks/useStepFormPath';
import { useStepIndex } from '../hooks/useStepIndex';
import { useStepInfoPath } from '../hooks/useStepInfoPath';
import { useStepVariantsCount } from '../hooks/useStepVariantsCount';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { IForm } from './formTypes';
import { makeVariantFromStep, useTemplateEditorForm } from './TemplateEditorFormProvider';
import { WorkflowNodeActions } from '../workflow/workflow/node-types/WorkflowNodeActions';

const variantsCreatePath = '/variants/create';

export const EditorSidebarHeaderActions = ({ preview = false }: { preview?: boolean }) => {
  const { control, watch, setValue } = useFormContext<IForm>();
  const { deleteStep, deleteVariant, template } = useTemplateEditorForm();
  const { readonly: isReadonly } = useEnvController({}, template?.chimera);
  const {
    stepUuid = '',
    channel = '',
    variantUuid = '',
  } = useParams<{
    stepUuid: string;
    channel: string;
    variantUuid: string;
  }>();
  const basePath = useBasePath();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [areConditionsOpened, setConditionsOpened] = useState(pathname.endsWith(variantsCreatePath));
  const [isDeleteModalOpened, setIsDeleteModalOpened] = useState(false);

  useEffect(() => {
    setConditionsOpened(pathname.endsWith(variantsCreatePath));
  }, [pathname]);
  // we need to know if we are creating a new variant to continue redirection to the new variant page
  const proceedToNewVariant = useRef(false);

  const stepFormPath = useStepFormPath();

  const { step: rootStep, stepIndex } = useStepIndex();
  const filterPartsList = useFilterPartsList({ index: stepIndex });
  const { isUnderTheStepPath, isUnderVariantsListPath, isUnderVariantPath } = useStepInfoPath();
  const { variantsCount } = useStepVariantsCount();

  const { append } = useFieldArray({
    control,
    name: `steps.${stepIndex}.variants`,
  });

  const isNewVariantCreationUrl = pathname.endsWith(variantsCreatePath);
  // [] is the default value for filters for the new variants
  const filters = isNewVariantCreationUrl ? [] : watch(`${stepFormPath}.filters.0.children`);
  const conditions = isNewVariantCreationUrl ? [] : watch(`${stepFormPath}.filters`);
  const formPathName = watch(`${stepFormPath}.name`);
  const name = isNewVariantCreationUrl ? `V${variantsCount + 1} ${formPathName}` : formPathName;
  const hasNoFilters = (filters && filters?.length === 0) || !filters || isNewVariantCreationUrl;
  const isDelayedStep = DELAYED_STEPS.includes(channel as StepTypeEnum);
  const isAddVariantActionAvailable = (isUnderTheStepPath || isUnderVariantsListPath) && !isDelayedStep;

  const onAddVariant = () => {
    const newPath = basePath + `/${channel}/${stepUuid}/variants/create`;
    navigate(newPath);
  };

  const onEdit = () => {
    const newPath = basePath + `/${channel}/${stepUuid}`;
    navigate(newPath);
  };

  const updateConditions = (newConditions: IConditions[]) => {
    if (isNewVariantCreationUrl) {
      proceedToNewVariant.current = true;
      if (!rootStep) {
        return;
      }

      const variant = makeVariantFromStep(rootStep, { conditions: newConditions });
      append(variant);
      navigate(basePath + `/${variant.template.type}/${stepUuid}/variants/${variant.uuid}`);
    } else {
      setValue(`${stepFormPath}.filters`, newConditions, { shouldDirty: true });
    }
  };

  const onConditionsClose = () => {
    if (isNewVariantCreationUrl && !proceedToNewVariant.current) {
      navigate(-1);

      return;
    }

    setConditionsOpened(false);
  };

  const openDeleteModal = () => {
    setIsDeleteModalOpened(true);
  };

  const confirmDelete = () => {
    if (isUnderVariantPath) {
      deleteVariant(stepUuid, variantUuid);
      navigate(basePath);
    }

    if (isUnderTheStepPath || isUnderVariantsListPath) {
      deleteStep(stepIndex);
      navigate(basePath);
    }
    setIsDeleteModalOpened(false);
  };

  const cancelDelete = () => {
    setIsDeleteModalOpened(false);
  };

  const conditionAction = isReadonly ? 'View' : hasNoFilters ? 'Add' : 'Edit';

  return (
    <>
      <When truthy={preview}>
        <WorkflowNodeActions
          onEdit={onEdit}
          onAddVariant={isAddVariantActionAvailable ? onAddVariant : undefined}
          onDelete={openDeleteModal}
          onAddConditions={() => setConditionsOpened(true)}
          channelType={channel as StepTypeEnum}
          nodeType={'step'}
          conditionsCount={filters?.length || 0}
          isReadOnly={isReadonly}
          menuPosition={'bottom'}
          showMenu={true}
        />
      </When>
      <When truthy={!preview}>
        <Group noWrap spacing={12} ml={'auto'} sx={{ alignItems: 'flex-start' }}>
          <When truthy={isAddVariantActionAvailable && !isReadonly}>
            <ActionButton
              tooltip="Add variant"
              onClick={onAddVariant}
              Icon={VariantPlus}
              data-test-id="editor-sidebar-add-variant"
            />
          </When>
          <When truthy={hasNoFilters && !isReadonly}>
            <ActionButton
              tooltip={`${conditionAction} ${isUnderVariantsListPath ? 'group' : ''} conditions`}
              onClick={() => setConditionsOpened(true)}
              Icon={ConditionPlus}
              data-test-id="editor-sidebar-add-conditions"
            />
          </When>
          <When truthy={!hasNoFilters}>
            <ActionButton
              tooltip={`${conditionAction} ${isUnderVariantsListPath ? 'group' : ''} conditions`}
              text={`${filters?.length ?? ''}`}
              onClick={() => setConditionsOpened(true)}
              Icon={Condition}
              data-test-id="editor-sidebar-edit-conditions"
            />
          </When>
          <When truthy={!isReadonly}>
            <ActionButton
              tooltip={`Delete ${isUnderVariantPath ? 'variant' : 'step'}`}
              onClick={openDeleteModal}
              Icon={Trash}
              data-test-id="editor-sidebar-delete"
            />
          </When>
        </Group>
      </When>
      {areConditionsOpened && (
        <Conditions
          isOpened={areConditionsOpened}
          isReadonly={isReadonly}
          name={name ?? ''}
          onClose={onConditionsClose}
          updateConditions={updateConditions}
          conditions={conditions}
          filterPartsList={filterPartsList}
          defaultFilter={FilterPartTypeEnum.PAYLOAD}
          shouldDisallowEmptyConditions={isUnderVariantPath}
        />
      )}

      <DeleteConfirmModal
        description={
          'This cannot be undone. ' +
          `The trigger code will be updated and this ${
            isUnderVariantPath ? 'variant' : 'step'
          } will no longer participate in the notification workflow.`
        }
        target={isUnderVariantPath ? 'variant' : 'step'}
        title={`Delete ${isUnderVariantPath ? 'variant' : 'step'}?`}
        isOpen={isDeleteModalOpened}
        confirm={confirmDelete}
        cancel={cancelDelete}
        confirmButtonText={`Delete ${isUnderVariantPath ? 'variant' : 'step'}`}
        cancelButtonText="Cancel"
      />
    </>
  );
};
