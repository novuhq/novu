import { Group } from '@mantine/core';
import { useEffect, useRef, useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { FilterPartTypeEnum } from '@novu/shared';
import { ActionButton, Condition, ConditionPlus, Trash, VariantPlus } from '@novu/design-system';

import { Conditions, IConditions } from '../../../components/conditions';
import { When } from '../../../components/utils/When';
import { useEnvController } from '../../../hooks';
import { useBasePath } from '../hooks/useBasePath';
import { useFilterPartsList } from '../hooks/useFilterPartsList';
import { useStepIndex } from '../hooks/useStepIndex';
import { useStepVariantsCount } from '../hooks/useStepVariantsCount';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { IForm } from './formTypes';
import { makeVariantFromStep, useTemplateEditorForm } from './TemplateEditorFormProvider';

const variantsCreatePath = '/variants/create';

export const VariantsListSidebarActions = () => {
  const { control, watch, setValue } = useFormContext<IForm>();
  const { deleteStep } = useTemplateEditorForm();
  const { readonly: isReadonly } = useEnvController();
  const { stepUuid = '', channel = '' } = useParams<{
    stepUuid: string;
    channel: string;
    variantUuid: string;
  }>();
  const basePath = useBasePath();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isNewVariantCreationUrl = pathname.endsWith(variantsCreatePath);
  const [areConditionsOpened, setConditionsOpened] = useState(isNewVariantCreationUrl);
  const [isDeleteModalOpened, setIsDeleteModalOpened] = useState(false);

  useEffect(() => {
    setConditionsOpened(isNewVariantCreationUrl);
  }, [isNewVariantCreationUrl]);
  // we need to know if we are creating a new variant to continue redirection to the new variant page
  const proceedToNewVariant = useRef(false);

  const { step: rootStep, stepIndex } = useStepIndex();
  const stepFormPath = `steps.${stepIndex}` as const;
  const filterPartsList = useFilterPartsList({ index: stepIndex });
  const { variantsCount } = useStepVariantsCount();

  const { append } = useFieldArray({
    control,
    name: `${stepFormPath}.variants`,
  });

  // [] is the default value for filters for the new variants
  const filters = isNewVariantCreationUrl ? [] : watch(`${stepFormPath}.filters.0.children`);
  const conditions = isNewVariantCreationUrl ? [] : watch(`${stepFormPath}.filters`);
  const formPathName = watch(`${stepFormPath}.name`);
  const name = isNewVariantCreationUrl ? `V${variantsCount + 1} ${formPathName}` : formPathName;
  const hasNoFilters = (filters && filters?.length === 0) || !filters || isNewVariantCreationUrl;

  const onAddVariant = () => {
    const newPath = basePath + `/${channel}/${stepUuid}/variants/create`;
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
    deleteStep(stepIndex);
    navigate(basePath);
    setIsDeleteModalOpened(false);
  };

  const cancelDelete = () => {
    setIsDeleteModalOpened(false);
  };

  const conditionAction = isReadonly ? 'View' : hasNoFilters ? 'Add' : 'Edit';

  return (
    <>
      <Group noWrap spacing={12} ml={'auto'} sx={{ alignItems: 'flex-start' }}>
        <When truthy={!isReadonly}>
          <ActionButton
            tooltip="Add variant"
            onClick={onAddVariant}
            Icon={VariantPlus}
            data-test-id="variant-sidebar-add-variant"
          />
        </When>
        <When truthy={hasNoFilters && !isReadonly}>
          <ActionButton
            tooltip={`${conditionAction} group conditions`}
            onClick={() => setConditionsOpened(true)}
            Icon={ConditionPlus}
            data-test-id="variant-sidebar-add-conditions"
          />
        </When>
        <When truthy={!hasNoFilters}>
          <ActionButton
            tooltip={`${conditionAction} group conditions`}
            text={`${filters?.length ?? ''}`}
            onClick={() => setConditionsOpened(true)}
            Icon={Condition}
            data-test-id="variant-sidebar-edit-conditions"
          />
        </When>
        <When truthy={!isReadonly}>
          <ActionButton
            tooltip={`Delete step`}
            onClick={openDeleteModal}
            Icon={Trash}
            data-test-id="variant-sidebar-delete"
          />
        </When>
      </Group>
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
        />
      )}

      <DeleteConfirmModal
        description={
          'This cannot be undone. ' +
          `The trigger code will be updated and this step will no longer participate in the notification workflow.`
        }
        target={'step'}
        title={`Delete step?`}
        isOpen={isDeleteModalOpened}
        confirm={confirmDelete}
        cancel={cancelDelete}
        confirmButtonText={`Delete step`}
        cancelButtonText="Cancel"
      />
    </>
  );
};
