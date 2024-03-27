import { MouseEventHandler } from 'react';
import styled from '@emotion/styled';
import { Group, Container } from '@mantine/core';
import {
  ActionButton,
  Dropdown,
  IDropdownProps,
  ConditionPlus,
  Condition,
  DotsHorizontal,
  NoConditions,
  PencilOutlined,
  Trash,
  VariantPlus,
} from '@novu/design-system';
import { DELAYED_STEPS, StepTypeEnum } from '@novu/shared';

import { NodeType } from './WorkflowNode';
import { When } from '../../../../../components/utils/When';

const ButtonsContainer = styled(Container)`
  padding: 0;
  margin-left: auto;
  margin-right: 0;
`;

const VARIANT_TYPE_TO_EDIT: Record<NodeType, string> = {
  step: 'Edit step',
  stepRoot: 'Edit root step',
  variant: 'Edit variant',
  variantRoot: 'Edit root step',
};

const VARIANT_TYPE_TO_ADD_CONDITIONS: Record<NodeType, string> = {
  step: 'Add conditions',
  stepRoot: 'Add group conditions',
  variant: 'Add variant conditions',
  variantRoot: 'Add group conditions',
};

const VARIANT_TYPE_TO_EDIT_CONDITIONS: Record<NodeType, string> = {
  step: 'Edit conditions',
  stepRoot: 'Edit group conditions',
  variant: 'Edit conditions',
  variantRoot: 'Edit group conditions',
};

const VARIANT_TYPE_TO_VIEW_CONDITIONS: Record<NodeType, string> = {
  step: 'View conditions',
  stepRoot: 'View group conditions',
  variant: 'View conditions',
  variantRoot: 'View group conditions',
};

const VARIANT_TYPE_TO_DELETE: Record<NodeType, string> = {
  step: 'Delete step',
  stepRoot: 'Delete step',
  variant: 'Delete variant',
  variantRoot: 'Delete step',
};

interface IWorkflowNodeActionsProps {
  nodeType: NodeType;
  menuPosition: IDropdownProps['position'];
  showMenu: boolean;
  isReadOnly: boolean;
  conditionsCount: number;
  channelType: StepTypeEnum;
  onDelete?: () => void;
  onAddVariant?: () => void;
  onEdit?: MouseEventHandler<HTMLButtonElement>;
  onAddConditions?: MouseEventHandler<HTMLButtonElement>;
}

export const WorkflowNodeActions = ({
  showMenu,
  isReadOnly,
  menuPosition,
  conditionsCount,
  nodeType = 'step',
  channelType,
  onEdit,
  onAddConditions,
  onAddVariant,
  onDelete,
}: IWorkflowNodeActionsProps) => {
  if (!onEdit && !onAddConditions) {
    return null;
  }

  if (nodeType === 'variantRoot') {
    return (
      <ButtonsContainer data-test-id="variant-root-actions">
        <When truthy={!showMenu}>
          <ActionButton
            onClick={onAddConditions}
            tooltip={
              conditionsCount > 0 ? VARIANT_TYPE_TO_EDIT_CONDITIONS[nodeType] : VARIANT_TYPE_TO_ADD_CONDITIONS[nodeType]
            }
            text="No"
            Icon={NoConditions}
            data-test-id="conditions-action"
          />
        </When>
        <When truthy={showMenu}>
          <Group noWrap spacing={5}>
            {onEdit && (
              <ActionButton
                onClick={onEdit}
                tooltip={VARIANT_TYPE_TO_EDIT[nodeType]}
                Icon={PencilOutlined}
                data-test-id="edit-step-action"
              />
            )}
          </Group>
        </When>
      </ButtonsContainer>
    );
  }

  const isDelayedStep = DELAYED_STEPS.includes(channelType);
  const conditionsAction = isReadOnly
    ? VARIANT_TYPE_TO_VIEW_CONDITIONS[nodeType]
    : conditionsCount > 0
    ? VARIANT_TYPE_TO_EDIT_CONDITIONS[nodeType]
    : VARIANT_TYPE_TO_ADD_CONDITIONS[nodeType];
  const conditionsIcon = isReadOnly || conditionsCount > 0 ? Condition : ConditionPlus;
  const isShowConditions = onAddConditions && (!isReadOnly || (isReadOnly && conditionsCount > 0));

  return (
    <ButtonsContainer data-test-id="step-actions">
      <When truthy={!showMenu && conditionsCount > 0}>
        <ActionButton
          onClick={onAddConditions}
          tooltip={conditionsAction}
          text={`${conditionsCount > 0 ? conditionsCount : ''}`}
          Icon={conditionsIcon}
          data-test-id="conditions-action"
        />
      </When>
      <When truthy={showMenu}>
        <Group noWrap spacing={5}>
          {onEdit && (
            <ActionButton
              onClick={onEdit}
              tooltip={VARIANT_TYPE_TO_EDIT[nodeType]}
              Icon={PencilOutlined}
              data-test-id="edit-action"
            />
          )}
          {isShowConditions && (
            <ActionButton
              onClick={onAddConditions}
              tooltip={conditionsAction}
              text={`${conditionsCount > 0 ? conditionsCount : ''}`}
              Icon={conditionsIcon}
              data-test-id="add-conditions-action"
            />
          )}
          <When truthy={!isReadOnly}>
            <Dropdown
              withinPortal
              position={menuPosition}
              withArrow={false}
              offset={0}
              control={
                <ActionButton
                  onClick={(e) => e.stopPropagation()}
                  Icon={DotsHorizontal}
                  data-test-id="step-actions-menu"
                />
              }
              middlewares={{ flip: false, shift: false }}
            >
              {onAddVariant && !isDelayedStep && (
                <Dropdown.Item
                  icon={<VariantPlus />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddVariant();
                  }}
                  data-test-id="add-variant-action"
                >
                  Add variant
                </Dropdown.Item>
              )}
              {onDelete && (
                <Dropdown.Item
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  icon={<Trash width="16px" height="16px" />}
                  data-test-id="delete-step-action"
                >
                  {VARIANT_TYPE_TO_DELETE[nodeType]}
                </Dropdown.Item>
              )}
            </Dropdown>
          </When>
        </Group>
      </When>
    </ButtonsContainer>
  );
};
