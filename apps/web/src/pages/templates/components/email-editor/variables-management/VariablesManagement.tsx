import { useWatch } from 'react-hook-form';
import { UnstyledButton } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import * as set from 'lodash.set';
import styled from '@emotion/styled';

import {
  Text,
  Tooltip,
  EditGradient,
  Translation,
  colors,
  NovuIcon,
  Search,
  Input,
  Workflow,
  shadows,
  EmptySearch,
} from '@novu/design-system';

import { VarItemsDropdown } from './VarItemsDropdown';
import { VarLabel } from './VarLabel';
import { useDebounce, useProcessVariables } from '../../../../../hooks';
import { VarItemTooltip } from './VarItemTooltip';
import { When } from '../../../../../components/utils/When';
import { getWorkflowVariables } from '../../../../../api/notification-templates';
import { useWorkflowVariables } from '../../../../../api/hooks';

interface IVariablesList {
  translations: Record<string, any>;
  step: Record<string, any>;
  system: Record<string, any>;
}

function searchByKey(object, searchString) {
  const varsObj: Record<string, any> = {};

  Object.keys(object).forEach((key) => {
    if (key.toLowerCase().includes(searchString.toLowerCase())) {
      set(varsObj, key, object[key]);
    }
  });

  return varsObj;
}

function flattenObject(obj, parentKey = '') {
  return Object.keys(obj).reduce((acc, key) => {
    const newKey = parentKey ? `${parentKey}.${key}` : key;

    if (typeof obj[key] === 'object' && obj[key] !== null) {
      Object.assign(acc, flattenObject(obj[key], newKey));
    } else {
      acc[newKey] = obj[key];
    }

    return acc;
  }, {});
}

const searchVariables = (list, search: string) => {
  const flatten = flattenObject(list);

  return searchByKey(flatten, search);
};

export const VariablesManagement = ({
  openVariablesModal,
  control,
  path,
}: {
  openVariablesModal?: () => void;
  control?: any;
  path: string;
}) => {
  const variableArray = useWatch({
    name: path,
    control,
  });

  const { variables } = useWorkflowVariables();

  const processedVariables = useProcessVariables(variableArray, false);
  const [variablesList, setVariablesList] = useState<IVariablesList>({
    ...variables,
    step: processedVariables,
  });
  const [searchVal, setSearchVal] = useState('');

  const debouncedSearchChange = useDebounce((args: { search: string; list: IVariablesList }) => {
    const { search, list } = args;
    const { system, translations, step } = list;
    setSearchVal(search);
    setVariablesList({
      system: searchVariables(system, search),
      translations: searchVariables(translations, search),
      step: searchVariables(step, search),
    });
  }, 500);

  useEffect(() => {
    if (variables) {
      setVariablesList({ ...variables, step: processedVariables });
    }
  }, [variables, processedVariables, setVariablesList]);

  const emptyVariablesList = Object.values(variablesList).every((list) => Object.keys(list).length === 0);

  const handleSearchVariable = (e) => {
    debouncedSearchChange({ search: e.target.value, list: { ...variables, step: processedVariables } });
  };

  return (
    <VariablesContainer>
      <When truthy={openVariablesModal !== undefined}>
        <div
          style={{
            textAlign: 'right',
            marginBottom: '20px',
          }}
        >
          <Tooltip label="Add defaults or mark as required">
            <UnstyledButton
              data-test-id="open-edit-variables-btn"
              onClick={() => {
                if (openVariablesModal) {
                  openVariablesModal();
                }
              }}
              type="button"
            >
              <Text gradient>
                Edit Variables
                <EditGradient
                  style={{
                    width: '18px',
                    height: '18px',
                    marginBottom: '-4px',
                    marginLeft: 5,
                  }}
                />
              </Text>
            </UnstyledButton>
          </Tooltip>
        </div>
      </When>
      <Input
        type={'search'}
        onChange={handleSearchVariable}
        mb={20}
        placeholder={'Search variables...'}
        rightSection={<Search />}
      />
      <When truthy={emptyVariablesList}>
        <EmptySearchContainer>
          <EmptySearch style={{ maxWidth: 200, marginBottom: 15 }} />
          <span style={{ color: colors.B40, fontSize: 16, fontWeight: 600, lineHeight: '20px' }}>No matches found</span>
          <span style={{ color: colors.B40, fontSize: 14, fontWeight: 400, lineHeight: '20px' }}>
            Try being less specific or using different keywords.
          </span>
        </EmptySearchContainer>
      </When>
      <When truthy={!emptyVariablesList}>
        <VariablesSection variablesList={variablesList} searchVal={searchVal} />
      </When>
    </VariablesContainer>
  );
};

const VariablesSection = ({ variablesList, searchVal }: { variablesList: IVariablesList; searchVal: string }) => {
  const { translations, system, step } = variablesList;

  return (
    <>
      <VariableSectionItem variableList={system} search={searchVal} sectionName="System Variables" Icon={NovuIcon} />
      <VariableSectionItem variableList={step} search={searchVal} sectionName="Step Variables" Icon={Workflow} />
      <VariableSectionItem
        withFolders
        variableList={translations}
        search={searchVal}
        sectionName={'Translation Variables'}
        Icon={Translation}
      />
    </>
  );
};

const VariableSectionItem = ({
  variableList,
  search,
  sectionName,
  Icon,
  withFolders = false,
}: {
  variableList: Record<string, any>;
  search: string;
  sectionName: string;
  Icon: React.FC<any>;
  withFolders?: boolean;
}) => {
  const keys = variableList && Object.keys(variableList);

  return (
    <When truthy={keys?.length}>
      <VarLabel label={sectionName} Icon={Icon}>
        {keys?.map((name, ind) => {
          if (typeof variableList[name] === 'object') {
            return (
              <VarItemsDropdown
                withFolders={withFolders}
                path={name}
                highlight={search}
                key={ind}
                name={name}
                type={variableList[name]}
              />
            );
          }

          return (
            <VarItemTooltip
              highlight={search}
              pathToCopy={name}
              name={name}
              type={typeof variableList[name]}
              key={ind}
            />
          );
        })}
      </VarLabel>
    </When>
  );
};

const VariablesContainer = styled.div`
  width: 100%;
  height: 100%;
  border-radius: 8px;
  padding: 15px;
  box-shadow: ${shadows.dark};
`;

const EmptySearchContainer = styled.div`
  text-align: center;
  flex-direction: column;
  min-height: 350px;
  display: flex;
  align-items: center;
  justify-content: center;
`;
