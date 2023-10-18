import { Group } from '@mantine/core';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { FilterPartTypeEnum } from '@novu/shared';

import { Conditions, IConditions } from '../../../components/conditions';
import { Condition, ConditionPlus, ConditionsFile, Trash, VariantPlus } from '../../../design-system/icons';
import { useFilterPartsList } from '../hooks/useFilterPartsList';
import { useStepFormPath } from '../hooks/useStepFormPath';
import { IForm } from './formTypes';
import { When } from '../../../components/utils/When';
import { useStepInfoPath } from '../hooks/useStepInfoPath';
import { useTemplateEditorForm } from './TemplateEditorFormProvider';
import { useBasePath } from '../hooks/useBasePath';
import { ActionButton } from '../../../design-system/button/ActionButton';
import { useEnvController } from '../../../hooks';
import { useStepIndex } from '../hooks/useStepIndex';
import { useStepVariantsCount } from '../hooks/useStepVariantsCount';

export const EditorSidebarHeaderActions = () => {
  const { watch, setValue } = useFormContext<IForm>();
  const { addVariant } = useTemplateEditorForm();
  const { readonly: isReadonly } = useEnvController();
  const { stepUuid = '', channel = '' } = useParams<{
    stepUuid: string;
    channel: string;
  }>();
  const basePath = useBasePath();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [areConditionsOpened, setConditionsOpened] = useState(
    () => pathname.endsWith('/conditions') || pathname.endsWith('variants/create')
  );
  const [proceedToNewVariant, setProceedToNewVariant] = useState(false);

  const stepFormPath = useStepFormPath();
  const filterPartsList = useFilterPartsList();
  const { isUnderTheStepPath, isUnderVariantsListPath } = useStepInfoPath();
  const { stepIndex } = useStepIndex();
  const { variantsCount } = useStepVariantsCount();

  const isNewVariantCreationUrl = pathname.endsWith('/variants/create');
  // [] is the default value for filters for the new variants
  const filters = isNewVariantCreationUrl ? [] : watch(`${stepFormPath}.filters.0.children`);
  const conditions = isNewVariantCreationUrl ? [] : watch(`${stepFormPath}.filters`);
  const formPathName = watch(`${stepFormPath}.name`);
  const name = isNewVariantCreationUrl ? `V${variantsCount + 1} ${formPathName}` : formPathName;

  const PlusIcon = isUnderVariantsListPath ? ConditionsFile : ConditionPlus;
  const ConditionsIcon = isUnderVariantsListPath ? ConditionsFile : Condition;
  const hasNoFilters = (filters && filters?.length === 0) || !filters || isNewVariantCreationUrl;

  const onAddVariant = () => {
    const newPath = basePath + `/${channel}/${stepUuid}/variants/create`;
    navigate(newPath);
  };

  const updateConditions = (newConditions: IConditions[]) => {
    if (isNewVariantCreationUrl) {
      setProceedToNewVariant(true);
      const variant = addVariant(stepUuid);
      if (variant) {
        const variantIndex = 0; // we add the variant at the beginning of the array
        setValue(`steps.${stepIndex}.variants.${variantIndex}.filters`, newConditions, { shouldDirty: true });
        navigate(basePath + `/${variant.template.type}/${stepUuid}/variants/${variant.uuid}`);
      }
    } else {
      setValue(`${stepFormPath}.filters`, newConditions, { shouldDirty: true });
    }
  };

  const onConditionsClose = () => {
    setConditionsOpened(false);

    const isConditionUrl = pathname.endsWith('/conditions');

    if (isConditionUrl) {
      const newPath = basePath.replace('/conditions', '');
      navigate(newPath);
    }

    if (isNewVariantCreationUrl && !proceedToNewVariant) {
      const newPath = pathname.replace('/create', '');
      navigate(newPath);
    }
  };

  return (
    <>
      <Group noWrap spacing={12} ml={'auto'} sx={{ alignItems: 'flex-start' }}>
        <When truthy={isUnderTheStepPath || isUnderVariantsListPath}>
          <ActionButton tooltip="Add variant" onClick={onAddVariant} Icon={VariantPlus} />
        </When>
        <When truthy={hasNoFilters}>
          <ActionButton
            tooltip={`Add ${isUnderVariantsListPath ? 'group' : ''} conditions`}
            onClick={() => setConditionsOpened(true)}
            Icon={PlusIcon}
            data-test-id="editor-sidebar-add-conditions"
          />
        </When>
        <When truthy={!hasNoFilters}>
          <ActionButton
            tooltip={`Edit ${isUnderVariantsListPath ? 'group' : ''} conditions`}
            text={`${filters?.length ?? ''}`}
            onClick={() => setConditionsOpened(true)}
            Icon={ConditionsIcon}
            data-test-id="editor-sidebar-edit-conditions"
          />
        </When>
        <ActionButton tooltip="Delete step" onClick={() => {}} Icon={Trash} data-test-id="editor-sidebar-delete" />
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
    </>
  );
};
