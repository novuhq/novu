import { useWatch } from 'react-hook-form';
import { Group, Stack, useMantineColorScheme, Center } from '@mantine/core';
import React, { useEffect, useState } from 'react';
import * as set from 'lodash.set';
import styled from '@emotion/styled';

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
  Button,
} from '@novu/design-system';

import { VarItemsDropdown } from './VarItemsDropdown';
import { VarLabel } from './VarLabel';
import { useDebounce, useProcessVariables } from '../../../../../hooks';
import { VarItemTooltip } from './VarItemTooltip';
import { When } from '../../../../../components/utils/When';
import { useWorkflowVariables } from '../../../../../api/hooks';
import { useProductFeature } from '@novu/shared-web';
import { ProductFeatureKeyEnum } from '@novu/shared';
import { Link, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../../../constants/routes.enum';
import { UpgradeContainer } from '../../../../../components/layout/components/UpgradeContainer';

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
  closeVariablesManagement,
  control,
  path,
  isPopover = false,
  chimera = false,
}: {
  openVariablesModal?: () => void;
  closeVariablesManagement?: () => void;
  control?: any;
  path: string;
  isPopover?: boolean;
  chimera?: boolean;
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
  // console.log(isTranslationsEnabled);
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
      <When truthy={openVariablesModal !== undefined && !chimera}>
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
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const navigate = useNavigate();
  const isTranslationsEnabled = useProductFeature(ProductFeatureKeyEnum.TRANSLATIONS);

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

export const TranslationSectionItem = ({
  variableList,
  search,
}: // sectionName,
// Icon,
// withFolders = false,
{
  variableList: Record<string, any>;
  search: string;
  // sectionName: string;
  // Icon: React.FC<any>;
  // withFolders?: boolean;
}) => {
  const sectionName = 'Translation Variables';
  const keys = variableList && Object.keys(variableList);
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const navigate = useNavigate();
  const isTranslationsEnabled = useProductFeature(ProductFeatureKeyEnum.TRANSLATIONS);

  return (
    <>
      <VariableSectionItem
        withFolders
        variableList={variableList}
        search={search}
        sectionName={'Translation Variables'}
        Icon={Translation}
      />
      {/*<When truthy={!keys?.length && sectionName === 'Translation Variables' && !isTranslationsEnabled}>*/}
      <When truthy={!keys?.length && !search.length}>
        <VarLabel label={sectionName} Icon={Translation}>
          <UpgradeContainer varBla={true} />
          <When truthy={isTranslationsEnabled}>
            <Stack
              style={{
                borderRadius: '7px',
                marginBottom: '24px',
                padding: '24px',
                background: isDark ? colors.B20 : colors.B98,
                alignItems: 'center',
              }}
            >
              <Text color={isDark ? colors.B60 : colors.B40}>
                <GradientSpan>
                  <a
                    onClick={() => {
                      navigate(ROUTES.TRANSLATIONS);
                    }}
                    style={{
                      cursor: 'pointer',
                    }}
                  >
                    Upload translations{' '}
                  </a>
                </GradientSpan>
                <span>to use them as variables or in the autosuggest for the editor.</span>
              </Text>
            </Stack>
          </When>
          {/*<Stack*/}
          {/*  spacing={8}*/}
          {/*  style={{*/}
          {/*    borderRadius: '7px',*/}
          {/*    marginBottom: '24px',*/}
          {/*    padding: '24px',*/}
          {/*    background: isDark ? colors.B20 : colors.B98,*/}
          {/*    alignItems: 'center',*/}
          {/*  }}*/}
          {/*>*/}
          {/*  <Text mb={8} align={'center'} color={colors.B60}>*/}
          {/*    Utilize i18n localization for translating notifications*/}
          {/*  </Text>*/}
          {/*  <Button onClick={() => navigate('/settings/billing')}>Upgrade plan</Button>*/}
          {/*  <Group position="center" spacing={4}>*/}
          {/*    <Text color={isDark ? colors.B60 : colors.B40}>Questions?</Text>*/}
          {/*    <Text gradient={true}>*/}
          {/*      <a*/}
          {/*        onClick={() => {*/}
          {/*          // onContactSales();*/}
          {/*        }}*/}
          {/*        style={{*/}
          {/*          cursor: 'pointer',*/}
          {/*        }}*/}
          {/*      >*/}
          {/*        Contact sales*/}
          {/*      </a>*/}
          {/*    </Text>*/}
          {/*  </Group>*/}
          {/*</Stack>*/}
        </VarLabel>
      </When>
      {/*<When*/}
      {/*  truthy={!keys?.length && !search.length && sectionName === 'Translation Variables' && isTranslationsEnabled}*/}
      {/*>*/}
      {/*  <VarLabel label={sectionName} Icon={Icon}>*/}
      {/*    <Stack*/}
      {/*      style={{*/}
      {/*        borderRadius: '7px',*/}
      {/*        marginBottom: '24px',*/}
      {/*        padding: '24px',*/}
      {/*        background: isDark ? colors.B20 : colors.B98,*/}
      {/*        alignItems: 'center',*/}
      {/*      }}*/}
      {/*    >*/}
      {/*     */}
      {/*      <Text color={isDark ? colors.B60 : colors.B40}>*/}
      {/*        <GradientSpan>*/}
      {/*          <a*/}
      {/*            onClick={() => {*/}
      {/*              navigate(ROUTES.TRANSLATIONS);*/}
      {/*            }}*/}
      {/*            style={{*/}
      {/*              cursor: 'pointer',*/}
      {/*            }}*/}
      {/*          >*/}
      {/*            Upload translations{' '}*/}
      {/*          </a>*/}
      {/*        </GradientSpan>*/}
      {/*        <span>to use them as variables or in the autosuggest for the editor.</span>*/}
      {/*      </Text>*/}
      {/*    </Stack>*/}
      {/*  </VarLabel>*/}
      {/*</When>*/}
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
