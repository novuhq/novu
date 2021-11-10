import React, { useContext } from 'react';
import uniqid from 'uniqid';
import { BuilderGroupValues } from '@notifire/shared';
import { Switch } from 'antd';
import { clone } from '../../utils/clone';
import { BuilderContext } from '../Context';

export interface GroupProps {
  value?: BuilderGroupValues;
  isNegated?: boolean;
  children?: React.ReactNode | React.ReactNodeArray;
  id: string;
  isRoot: boolean;
}

export const Group: React.FC<GroupProps> = ({ value, isNegated, children, id, isRoot }: GroupProps) => {
  const { components, data, setData, onChange, strings, readOnly } = useContext(BuilderContext);
  const { Add, Group: GroupContainer, GroupHeaderOption: Option, Remove } = components;

  const findIndex = () => {
    const clonedData = clone(data);
    const parentIndex = clonedData.findIndex((item: any) => item.id === id);
    let insertAfter = parentIndex;

    if (data[parentIndex].children && data[parentIndex].children.length > 0) {
      const lastChildren = clonedData[parentIndex].children.slice(-1)[0];
      insertAfter = clonedData.findIndex((item: any) => item.id === lastChildren);
    }

    return { insertAfter, parentIndex, clonedData };
  };

  const addItem = (payload: any) => {
    const { insertAfter, parentIndex, clonedData } = findIndex();

    if (!clonedData[parentIndex].children) {
      clonedData[insertAfter].children = [];
    }

    clonedData[parentIndex].children.push(payload.id);
    clonedData.splice(Number(insertAfter) + 1, 0, payload);

    setData(clonedData);
    if (onChange) {
      onChange(clonedData);
    }
  };

  const handleAddGroup = () => {
    const EmptyGroup: any = {
      type: 'GROUP',
      value: 'AND',
      isNegated: false,
      id: uniqid(),
      parent: id,
      children: [],
    };

    addItem(EmptyGroup);
  };

  const handleAddRule = () => {
    const EmptyRule: any = {
      field: '',
      id: uniqid(),
      parent: id,
    };

    addItem(EmptyRule);
  };

  const handleChangeGroupType = (nextValue: BuilderGroupValues) => {
    const { clonedData, parentIndex } = findIndex();
    clonedData[parentIndex].value = nextValue;

    setData(clonedData);
    if (onChange) {
      onChange(clonedData);
    }
  };

  const handleToggleNegateGroup = (nextValue: boolean) => {
    const { clonedData, parentIndex } = findIndex();
    clonedData[parentIndex].isNegated = nextValue;

    setData(clonedData);

    if (onChange) {
      onChange(clonedData);
    }
  };

  const handleDeleteGroup = () => {
    let clonedData = clone(data).filter((item: any) => item.id !== id);

    clonedData = clonedData.map((item: any) => {
      if (item.children && item.children.length > 0) {
        // eslint-disable-next-line no-param-reassign
        item.children = item.children.filter((childId: string) => childId !== id);
      }

      return item;
    });

    setData(clonedData);
    if (onChange) {
      onChange(clonedData);
    }
  };

  if (strings.group) {
    return (
      <GroupContainer
        isRoot={isRoot}
        show={data?.length > 2}
        controlsLeft={
          <>
            {data?.length > 2 && (
              <>
                <Option
                  isSelected={value === 'AND'}
                  value="AND"
                  disabled={readOnly}
                  onClick={handleChangeGroupType}
                  data-test-id="Option[and]">
                  {strings.group.and}
                </Option>
                <Option
                  isSelected={value === 'OR'}
                  value="OR"
                  disabled={readOnly}
                  onClick={handleChangeGroupType}
                  data-test-id="Option[or]">
                  {strings.group.or}
                </Option>
              </>
            )}
            {/*    <Option
              isSelected={!!isNegated}
              value={!isNegated}
              disabled={readOnly}
              onClick={handleToggleNegateGroup}
              data-test="Option[not]">
              {strings.group.not}
            </Option> */}
          </>
        }>
        {children}
        {!readOnly && (
          <div style={{ textAlign: 'center' }}>
            <Add onClick={handleAddRule} label={strings.group.addRule} data-test-id="AddRule" />
            {/*
              <Add onClick={handleAddGroup} label={strings.group.addGroup} data-test="AddGroup" />
*/}
            {!isRoot && <Remove onClick={handleDeleteGroup} label={strings.group.delete} data-test-id="Remove" />}
          </div>
        )}
      </GroupContainer>
    );
  }

  return null;
};
