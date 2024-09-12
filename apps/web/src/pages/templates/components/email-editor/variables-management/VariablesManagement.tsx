import { useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import set from 'lodash.set';
import styled from '@emotion/styled';
import { Group, useMantineColorScheme } from '@mantine/core';

import {
  Translation,
  colors,
  NovuIcon,
  Search,
  Input,
  Workflow,
  shadows,
  EmptySearch,
  ActionButton,
  PencilOutlined,
  Close,
  Text,
} from '@novu/design-system';

import { VarItemsDropdown } from './VarItemsDropdown';
import { VarLabel } from './VarLabel';
import { useDebounce, useProcessVariables } from '../../../../../hooks';
import { VarItemTooltip } from './VarItemTooltip';
import { When } from '../../../../../components/utils/When';
import { useWorkflowVariables } from '../../../../../api/hooks';

import { ROUTES } from '../../../../../constants/routes';
import { UpgradePlanBanner } from '../../../../../components/layout/components/UpgradePlanBanner';

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
  return Object.keys(obj).reduce((prev, key) => {
    const newKey = parentKey ? `${parentKey}.${key}` : key;

    if (typeof obj[key] === 'object' && obj[key] !== null) {
      Object.assign(prev, flattenObject(obj[key], newKey));
    } else {
      prev[newKey] = obj[key];
    }

    return prev;
  }, {});
}

const searchVariables = (list, search: string) => {
  const flatten = flattenObject(list);

  return searchByKey(flatten, search);
};

export const VariablesManagement = ({
  openVariablesModal,
  closeVariablesManagement,
  control,
  path,
  isPopover = false,
  bridge = false,
}: {
  openVariablesModal?: () => void;
  closeVariablesManagement?: () => void;
  control?: any;
  path: string;
  isPopover?: boolean;
  bridge?: boolean;
}) => {
  const variableArray = useWatch({
    name: path,
    control,
  });
  const { colorScheme } = useMantineColorScheme();

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
    <VariablesContainer isPopover={isPopover}>
      <When truthy={openVariablesModal !== undefined && !bridge}>
        <Group
          px={16}
          h={40}
          noWrap
          spacing={20}
          position={'right'}
          style={{
            borderRadius: '8px 8px 0px 0px',
            backgroundColor: colorScheme === 'dark' ? colors.B15 : colors.BGLight,
          }}
        >
          <ActionButton
            onClick={() => {
              if (openVariablesModal) {
                openVariablesModal();
              }
            }}
            Icon={PencilOutlined}
            data-test-id="open-edit-variables-btn"
            tooltip={'Add defaults or mark as required'}
          />
          <When truthy={closeVariablesManagement}>
            <ActionButton
              onClick={closeVariablesManagement}
              sx={{
                '> svg': {
                  width: 14,
                  height: 14,
                },
              }}
              Icon={Close}
            />
          </When>
        </Group>
      </When>
      <div style={{ padding: '12px' }}>
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
            <span style={{ color: colors.B40, fontSize: 16, fontWeight: 600, lineHeight: '20px' }}>
              No matches found
            </span>
            <span style={{ color: colors.B40, fontSize: 14, fontWeight: 400, lineHeight: '20px' }}>
              Try being less specific or using different keywords.
            </span>
          </EmptySearchContainer>
        </When>
        <When truthy={!emptyVariablesList}>
          <VariablesSection variablesList={variablesList} searchVal={searchVal} />
        </When>
      </div>
    </VariablesContainer>
  );
};

const VariablesSection = ({ variablesList, searchVal }: { variablesList: IVariablesList; searchVal: string }) => {
  const { translations, system, step } = variablesList;

  return (
    <>
      <VariableSectionItem variableList={system} search={searchVal} sectionName="System Variables" Icon={NovuIcon} />
      <VariableSectionItem variableList={step} search={searchVal} sectionName="Step Variables" Icon={Workflow} />
      <TranslationSectionItem variableList={translations} search={searchVal} />
    </>
  );
};

export const VariableSectionItem = ({
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
    <>
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
    </>
  );
};
const TranslationsGetStartedText = () => {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const navigate = useNavigate();

  return (
    <Text color={isDark ? colors.B60 : colors.B40}>
      <GradientSpan>
        <a
          onClick={() => {
            navigate(ROUTES.TRANSLATIONS);
          }}
        >
          Upload translations{' '}
        </a>
      </GradientSpan>
      <span>to use them as variables or in the autosuggest for the editor.</span>
    </Text>
  );
};

export const TranslationSectionItem = ({
  variableList,
  search,
}: {
  variableList: Record<string, any>;
  search: string;
}) => {
  const sectionName = 'Translation Variables';
  const keys = variableList && Object.keys(variableList);

  return (
    <>
      <VariableSectionItem
        withFolders
        variableList={variableList}
        search={search}
        sectionName={sectionName}
        Icon={Translation}
      />
      <When truthy={!keys?.length && !search.length}>
        <VarLabel label={sectionName} Icon={Translation}>
          <UpgradePlanBanner FeatureActivatedBanner={TranslationsGetStartedText} />
        </VarLabel>
      </When>
    </>
  );
};

const VariablesContainer = styled.div<{ isPopover: boolean }>`
  width: 100%;
  height: 100%;
  border-radius: 8px;
  box-shadow: ${({ isPopover }) => (isPopover ? 'none' : shadows.dark)};
`;

const EmptySearchContainer = styled.div`
  text-align: center;
  flex-direction: column;
  min-height: 350px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const GradientSpan = styled.span`
  background: ${colors.horizontal};
  background-clip: text;
  text-fill-color: transparent;

  &:hover {
    cursor: pointer;
  }
`;
