import { memo, useEffect, useState } from 'react';
import { Handle, Position, getOutgoers, useReactFlow, useNodes } from 'react-flow-renderer';
import { FilterPartTypeEnum } from '@novu/shared';

import { WorkflowNode } from './WorkflowNode';
import { useParams } from 'react-router-dom';
import { INode } from '../../../../../components/workflow/types';
import { useStepSubtitle } from '../../../hooks/useStepSubtitle';
import { Conditions } from '../../../../../components/conditions';
import { useFilterPartsList } from '../../../hooks/useFilterPartsList';
import { IForm } from '../../../components/formTypes';
import { useFormContext } from 'react-hook-form';

export default memo((node: INode) => {
  const { data, id, dragging } = node;
  const { isReadonly, testId, error, channelType, step, label, index, tabKey, Icon, onAddVariant, onDelete, onEdit } =
    data;
  const { setValue } = useFormContext<IForm>();
  const { getNode, getEdges, getNodes } = useReactFlow();
  const nodes = useNodes<INode['data']>();
  const thisNode = getNode(id);
  const isParent = thisNode ? getOutgoers(thisNode, getNodes(), getEdges()).length : false;
  const noChildStyle = isParent ? {} : { border: 'none', background: 'transparent' };
  const [count, setCount] = useState(0);
  const [areConditionsOpened, setConditionsOpened] = useState(false);
  const { stepUuid = '' } = useParams<{ stepUuid: string }>();
  const filterPartsList = useFilterPartsList({ index });

  useEffect(() => {
    const items = nodes
      .filter((el) => el.type === 'channelNode')
      .filter((el) => {
        return el.data.channelType === channelType;
      });

    if (items.length <= 1) {
      setCount(0);

      return;
    }

    const foundIndex = items.findIndex((el) => el.id === id);

    if (foundIndex === -1) {
      setCount(0);

      return;
    }

    setCount(foundIndex + 1);
  }, [nodes, channelType, id]);

  const subtitle = useStepSubtitle({ path: `steps.${index}`, step, channelType });

  if (!step) {
    return null;
  }

  const { active, uuid, name, stepId, filters: conditions } = step;
  const variantsCount = step.variants?.length;
  const conditionsCount = conditions && conditions.length > 0 ? conditions[0].children?.length ?? 0 : 0;

  const onConditionsClose = () => setConditionsOpened(false);

  const onUpdateConditions = (newConditions) => {
    setValue(`steps.${index}.filters`, newConditions, { shouldDirty: true });
  };

  return (
    <div data-test-id={`node-${testId}`} style={{ pointerEvents: 'none' }}>
      <WorkflowNode
        errors={error}
        onEdit={(e) => {
          e.preventDefault();
          e.stopPropagation();

          onEdit(e, node);
        }}
        onDelete={() => {
          onDelete(uuid ?? '');
        }}
        onAddVariant={() => {
          onAddVariant(uuid ?? '');
        }}
        onAddConditions={(e) => {
          e.preventDefault();
          e.stopPropagation();

          setConditionsOpened(true);
        }}
        nodeType={variantsCount && variantsCount > 0 ? 'stepRoot' : 'step'}
        variantsCount={variantsCount}
        conditionsCount={conditionsCount}
        tabKey={tabKey}
        channelType={channelType}
        Icon={Icon}
        label={name || stepId ? name || (stepId as string) : label + (count > 0 ? ` (${count})` : '')}
        active={stepUuid === uuid}
        disabled={!active}
        id={id}
        index={index}
        testId={'channel-node'}
        dragging={dragging}
        subtitle={subtitle}
      />
      <Handle type="target" id="b" position={Position.Top} />
      <Handle style={noChildStyle} type="source" id="a" position={Position.Bottom} />
      {areConditionsOpened && (
        <Conditions
          isOpened={areConditionsOpened}
          isReadonly={isReadonly}
          name={name ?? ''}
          onClose={onConditionsClose}
          updateConditions={onUpdateConditions}
          conditions={conditions}
          filterPartsList={filterPartsList}
          defaultFilter={FilterPartTypeEnum.PAYLOAD}
        />
      )}
    </div>
  );
});
