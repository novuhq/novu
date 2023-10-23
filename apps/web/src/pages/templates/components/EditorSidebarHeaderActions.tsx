import { Group } from '@mantine/core';
import { FilterPartTypeEnum } from '@novu/shared';
import { useEffect, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { Conditions, IConditions } from '../../../components/conditions';
import { When } from '../../../components/utils/When';
import { ActionButton } from '../../../design-system/button/ActionButton';
import { Condition, ConditionPlus, ConditionsFile, Trash, VariantPlus } from '../../../design-system/icons';
import { useEnvController } from '../../../hooks';
import { useBasePath } from '../hooks/useBasePath';
import { useFilterPartsList } from '../hooks/useFilterPartsList';
import { useStepFormPath } from '../hooks/useStepFormPath';
import { useStepIndex } from '../hooks/useStepIndex';
import { useStepInfoPath } from '../hooks/useStepInfoPath';
import { useStepVariantsCount } from '../hooks/useStepVariantsCount';
import { IForm } from './formTypes';
import { useTemplateEditorForm } from './TemplateEditorFormProvider';

const variantsCreatePath = '/variants/create';

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
  const [areConditionsOpened, setConditionsOpened] = useState(pathname.endsWith(variantsCreatePath));

  useEffect(() => {
    setConditionsOpened(pathname.endsWith(variantsCreatePath));
  }, [pathname]);
  // we need to know if we are creating a new variant to continue redirection to the new variant page
  const proceedToNewVariant = useRef(false);

  const stepFormPath = useStepFormPath();
  const { stepIndex } = useStepIndex();
  const filterPartsList = useFilterPartsList({ index: stepIndex });
  const { isUnderTheStepPath, isUnderVariantsListPath } = useStepInfoPath();
  const { variantsCount } = useStepVariantsCount();

  const isNewVariantCreationUrl = pathname.endsWith(variantsCreatePath);
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
      proceedToNewVariant.current = true;
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

    if (isNewVariantCreationUrl && !proceedToNewVariant.current) {
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
