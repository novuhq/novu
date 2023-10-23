import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import styled from '@emotion/styled';
import { StepTypeEnum, FilterPartTypeEnum, STEP_TYPE_TO_CHANNEL_TYPE } from '@novu/shared';

import { stepIcon } from '../constants';
import { useBasePath } from '../hooks/useBasePath';
import { useStepSubtitle } from '../hooks/useStepSubtitle';
import { NodeType, WorkflowNode } from '../workflow/workflow/node-types/WorkflowNode';
import { IForm, IFormStep, IVariantStep } from './formTypes';
import { colors } from '../../../design-system';
import { Check, Conditions as ConditionsIcon } from '../../../design-system/icons';
import { When } from '../../../components/utils/When';
import { useFilterPartsList } from '../hooks/useFilterPartsList';
import { Conditions } from '../../../components/conditions';

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
}: {
  isReadonly?: boolean;
  stepIndex?: number;
  variantIndex?: number;
  isFirst?: boolean;
  variant: IFormStep | IVariantStep;
  nodeType: NodeType;
}) => {
  const { setValue } = useFormContext<IForm>();
  const { channel, stepUuid = '' } = useParams<{
    channel: StepTypeEnum;
    stepUuid: string;
  }>();
  const subtitle = useStepSubtitle(variant, channel);
  const navigate = useNavigate();
  const basePath = useBasePath();
  const [areConditionsOpened, setConditionsOpened] = useState(false);
  const filterPartsList = useFilterPartsList({ index: stepIndex });

  const Icon = stepIcon[channel ?? ''];
  const variantsCount = ('variants' in variant ? variant.variants?.length : 0) ?? 0;
  const isRoot = nodeType === 'variantRoot';
  const conditions = variant.filters ?? [];
  const conditionsCount = conditions && conditions.length > 0 ? conditions[0].children?.length ?? 0 : 0;

  const onEdit = () => {
    if (isRoot) {
      navigate(basePath + `/${channel}/${stepUuid}`);

      return;
    }
    navigate(basePath + `/${channel}/${stepUuid}/variants/${variant.uuid}`);
  };

  const onDelete = () => {};

  const onAddConditions = (e) => {
    e.preventDefault();
    e.stopPropagation();

    setConditionsOpened(true);
  };

  const onConditionsClose = () => setConditionsOpened(false);

  const onUpdateConditions = (newConditions) => {
    setValue(`steps.${stepIndex}.variants.${variantIndex}.filters`, newConditions, { shouldDirty: true });
  };

  return (
    <VariantItemCardHolder>
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
        tabKey={STEP_TYPE_TO_CHANNEL_TYPE.get(variant.template.type)}
        channelType={variant.template.type}
        variantsCount={variantsCount}
        conditionsCount={conditionsCount}
        onEdit={onEdit}
        onDelete={onDelete}
        onAddConditions={onAddConditions}
        menuPosition="bottom-end"
        nodeType={nodeType}
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
        />
      )}
    </VariantItemCardHolder>
  );
};
