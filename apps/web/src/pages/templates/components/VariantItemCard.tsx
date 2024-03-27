import styled from '@emotion/styled';
import { FilterPartTypeEnum, StepTypeEnum, STEP_TYPE_TO_CHANNEL_TYPE } from '@novu/shared';
import { MouseEventHandler, useEffect, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { colors, Check, Conditions as ConditionsIcon } from '@novu/design-system';

import { Conditions } from '../../../components/conditions';
import { When } from '../../../components/utils/When';
import { stepIcon } from '../constants';
import { useBasePath } from '../hooks/useBasePath';
import { useFilterPartsList } from '../hooks/useFilterPartsList';
import { useStepSubtitle } from '../hooks/useStepSubtitle';
import { NodeType, WorkflowNode } from '../workflow/workflow/node-types/WorkflowNode';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { IForm, IFormStep, IVariantStep } from './formTypes';
import { useTemplateEditorForm } from './TemplateEditorFormProvider';
import { NODE_ERROR_TYPES } from '../workflow/workflow/node-types/utils';
import { useNavigateToVariantPreview } from '../hooks/useNavigateToVariantPreview';

const VariantItemCardHolder = styled.div`
  display: grid;
  grid-template-columns: max-content 1fr max-content 1fr max-content;
  grid-template-rows: max-content 1fr max-content 1fr;
  gap: 6px;
  margin-bottom: 6px;
`;

const FlexContainer = styled.span`
  display: flex;
  justify-content: center;
  align-items: center;
`;

const WorkflowNodeStyled = styled(WorkflowNode)`
  cursor: pointer;
  grid-column: 5 / -1;
  grid-row: 2 / -1;
`;

const HorizontalLine = styled.span`
  height: 2px;
  width: 100%;
  border-top: 2px dashed ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B40 : colors.B60)};
`;

const VerticalLine = styled.span`
  width: 2px;
  height: 100%;
  border-left: 2px dashed ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B40 : colors.B60)};
`;

const LeftBottomCorner = styled.span`
  border-bottom: 2px dashed ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B40 : colors.B60)};
  border-left: 2px dashed ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B40 : colors.B60)};
  border-radius: 0 0 0 8px;
  margin: 0 0 8px 8px;
  grid-column: 1 / span 2;
  grid-row: 2 / span 2;
`;

const NoSpan = styled.span`
  color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B40 : colors.B60)};
  line-height: 20px;
  grid-column: 1 / span 1;
  grid-row: 1 / span 1;
`;

const NoLine = styled(FlexContainer)`
  height: 15px;
  grid-column: 1 / span 1;
  grid-row: 1 / span 1;
`;

const ConditionsItem = styled(FlexContainer)`
  grid-column: 1 / span 1;
  grid-row: 3 / span 1;
`;

const ConditionsIconStyled = styled(ConditionsIcon)`
  width: 16px;
  height: 16px;
  color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B40 : colors.B60)};
`;

const CheckItem = styled(FlexContainer)`
  grid-column: 3 / span 1;
  grid-row: 3 / span 1;
`;

const CheckIcon = styled(Check)`
  width: 16px;
  height: 16px;
  color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B40 : colors.B60)};
`;

const BottomNoLine = styled(FlexContainer)`
  grid-column: 1 / span 1;
  grid-row: 2 / span 1;
`;

const BottomConditionsLine = styled(FlexContainer)`
  grid-column: 1;
  grid-row: 4 / -1;
`;

const RightConditionsLine = styled(FlexContainer)`
  grid-column: 2 / span 1;
  grid-row: 3 / span 1;
`;

const RightCheckLine = styled(FlexContainer)`
  grid-column: 4 / span 1;
  grid-row: 3 / span 1;
`;

export const VariantItemCard = ({
  isReadonly = false,
  stepIndex = 0,
  variantIndex = 0,
  isFirst = false,
  nodeType,
  variant,
  'data-test-id': dataTestId,
  errorMessage,
  nodeErrorType,
}: {
  isReadonly?: boolean;
  stepIndex?: number;
  variantIndex?: number;
  isFirst?: boolean;
  variant: IFormStep | IVariantStep;
  nodeType: NodeType;
  'data-test-id'?: string;
  errorMessage?: string;
  nodeErrorType?: NODE_ERROR_TYPES;
}) => {
  const { setValue } = useFormContext<IForm>();
  const {
    channel,
    stepUuid = '',
    variantUuid = '',
  } = useParams<{
    channel: StepTypeEnum;
    stepUuid: string;
    variantUuid: string;
  }>();
  const subtitle = useStepSubtitle({
    path: `steps.${stepIndex}.variants.${variantIndex}`,
    step: variant,
    channelType: channel,
  });
  const navigate = useNavigate();
  const basePath = useBasePath();
  const { navigateToVariantPreview } = useNavigateToVariantPreview();
  const [areConditionsOpened, setConditionsOpened] = useState(false);
  const filterPartsList = useFilterPartsList({ index: stepIndex });
  const { deleteVariant } = useTemplateEditorForm();
  const [isDeleteModalOpened, setIsDeleteModalOpened] = useState(false);
  const variantItemCardHolderRef = useRef<HTMLDivElement | null>(null);

  const Icon = stepIcon[channel ?? ''];
  const variantsCount = ('variants' in variant ? variant.variants?.length : 0) ?? 0;
  const isRoot = nodeType === 'variantRoot';
  const isSelected = (isRoot && stepUuid === variantUuid) || variant.uuid === variantUuid;
  const conditions = variant.filters ?? [];
  const conditionsCount = conditions && conditions.length > 0 ? conditions[0].children?.length ?? 0 : 0;

  const onEdit: MouseEventHandler<HTMLButtonElement> = (e) => {
    e.stopPropagation();
    if (isRoot) {
      navigate(basePath + `/${channel}/${stepUuid}`);

      return;
    }
    navigate(basePath + `/${channel}/${stepUuid}/variants/${variant.uuid}`);
  };

  const onClick: MouseEventHandler<HTMLDivElement> = (e) => {
    e.stopPropagation();
    navigateToVariantPreview({ variantUuid: variant.uuid });
  };

  const onDeleteIcon = () => {
    setIsDeleteModalOpened(true);
  };

  const confirmDelete = () => {
    setIsDeleteModalOpened(false);
    if (!stepUuid || !variant?.uuid) {
      return;
    }

    deleteVariant(stepUuid, variant.uuid);
  };

  const cancelDelete = () => {
    setIsDeleteModalOpened(false);
  };

  const onAddConditions = (e) => {
    e.preventDefault();
    e.stopPropagation();

    setConditionsOpened(true);
  };

  const onConditionsClose = () => setConditionsOpened(false);

  const onUpdateConditions = (newConditions) => {
    setValue(`steps.${stepIndex}.variants.${variantIndex}.filters`, newConditions, { shouldDirty: true });
  };

  useEffect(() => {
    if (isSelected) {
      variantItemCardHolderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isSelected]);

  return (
    <VariantItemCardHolder ref={variantItemCardHolderRef} data-test-id={dataTestId}>
      {!isFirst ? (
        <NoSpan>No</NoSpan>
      ) : (
        <NoLine>
          <VerticalLine />
        </NoLine>
      )}
      <When truthy={!isRoot}>
        <BottomNoLine>
          <VerticalLine />
        </BottomNoLine>
        <ConditionsItem>
          <ConditionsIconStyled />
        </ConditionsItem>
        <BottomConditionsLine>
          <VerticalLine />
        </BottomConditionsLine>
        <RightConditionsLine>
          <HorizontalLine />
        </RightConditionsLine>
      </When>
      <When truthy={isRoot}>
        <LeftBottomCorner />
      </When>
      <CheckItem>
        <CheckIcon />
      </CheckItem>
      <RightCheckLine>
        <HorizontalLine />
      </RightCheckLine>
      <WorkflowNodeStyled
        Icon={Icon}
        label={variant.name ?? ''}
        subtitle={subtitle}
        tabKey={STEP_TYPE_TO_CHANNEL_TYPE.get(variant.template?.type)}
        channelType={variant.template?.type}
        variantsCount={variantsCount}
        conditionsCount={conditionsCount}
        onClick={onClick}
        onEdit={onEdit}
        onDelete={onDeleteIcon}
        onAddConditions={onAddConditions}
        menuPosition="bottom-end"
        nodeType={nodeType}
        errors={errorMessage}
        nodeErrorType={nodeErrorType}
        active={isSelected}
      />
      {areConditionsOpened && (
        <Conditions
          isOpened
          isReadonly={isReadonly}
          name={variant.name ?? ''}
          onClose={onConditionsClose}
          updateConditions={onUpdateConditions}
          conditions={conditions}
          filterPartsList={filterPartsList}
          defaultFilter={FilterPartTypeEnum.PAYLOAD}
          shouldDisallowEmptyConditions
        />
      )}
      <DeleteConfirmModal
        description={
          'This cannot be undone. ' +
          'The trigger code will be updated and this variant will no longer participate in the notification workflow.'
        }
        target="variant"
        title={`Delete variant?`}
        isOpen={isDeleteModalOpened}
        confirm={confirmDelete}
        cancel={cancelDelete}
        confirmButtonText="Delete variant"
        cancelButtonText="Cancel"
      />
    </VariantItemCardHolder>
  );
};
