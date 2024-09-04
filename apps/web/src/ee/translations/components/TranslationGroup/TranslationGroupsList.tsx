import styled from '@emotion/styled';
import { Group, Indicator } from '@mantine/core';
import { colors, IExtendedColumn, Table, Text, Tooltip, withCellLoading, IRow } from '@novu/design-system';
import { format } from 'date-fns';
import React from 'react';
import { ITranslationGroup } from '../../hooks';
import { TranslationFolderIconSmall } from '../../icons';
import { FlagIcon } from '../shared';
import { Warning } from '../../icons/Warning';

const TranslationNameCell = withCellLoading(({ row: { original } }) => {
  const localesLength = original.uiConfig?.locales?.length;
  const missingLocalesLength = original.uiConfig?.localesMissingTranslations?.length;

  return (
    <>
      <Group spacing={8} align="center" data-test-id={original.identifier}>
        <Tooltip
          label={
            <Text color="#EAA900">
              {missingLocalesLength === localesLength ? 'All' : 'Some'} languages missing value
            </Text>
          }
          disabled={!missingLocalesLength}
          position="bottom"
        >
          <Indicator
            label={<Warning width="16px" height="16px" />}
            position="bottom-end"
            size={16}
            offset={6}
            zIndex={'auto'}
            disabled={!missingLocalesLength}
            inline
          >
            <TranslationFolderIconSmall />
          </Indicator>
        </Tooltip>
        <div>
          <Text>{original.name}</Text>
          <Text color={colors.B40} size={12}>
            {original.identifier}
          </Text>
        </div>
      </Group>
    </>
  );
});

const LanguagesCell = withCellLoading(({ row: { original } }) => {
  const locales = original.uiConfig?.locales || [];
  const localesLimit = 5;
  const localesLength = locales.length;
  const localesExceedLimit = localesLength > localesLimit;
  const localesToDisplay = localesExceedLimit ? locales.slice(0, localesLimit) : locales;

  return (
    <Group align="center" spacing={8}>
      {localesToDisplay?.map((locale, index) => (
        <Tooltip key={index} label={locale}>
          <FlagContainer>
            <FlagIcon locale={locale} width={20} height={20} />
          </FlagContainer>
        </Tooltip>
      ))}
      {localesExceedLimit && <LocalesBadge>+{localesLength - localesLimit}</LocalesBadge>}
    </Group>
  );
});

const columns: IExtendedColumn<ITranslationGroup>[] = [
  {
    accessor: 'name',
    Header: 'Name',
    Cell: TranslationNameCell,
  },
  {
    accessor: 'locales',
    Header: 'Languages',
    Cell: LanguagesCell,
  },
  {
    accessor: 'createdAt',
    Header: 'Created At',
    Cell: withCellLoading(({ row: { original } }) => (
      <Text color={colors.B60}>{format(new Date(original.createdAt), 'dd/MM/yyyy HH:mm')}</Text>
    )),
  },
  {
    accessor: 'updatedAt',
    Header: 'Updated At',
    Cell: withCellLoading(({ row: { original } }) => (
      <Text color={colors.B60}>{format(new Date(original.updatedAt), 'dd/MM/yyyy HH:mm')}</Text>
    )),
  },
];

export function TranslationGroupsList({
  isLoading,
  data,
  page,
  pageSize,
  totalCount,
  handlePageChange,
  onRowClick,
}: {
  isLoading: boolean;
  data: ITranslationGroup[];
  page: number;
  pageSize: number;
  totalCount: number;
  onRowClick: (row: IRow<ITranslationGroup>) => void;
  handlePageChange: (page: number) => void;
}) {
  return (
    <div>
      <Table
        loading={isLoading}
        data-test-id="translation-group-table"
        columns={columns}
        data={data || []}
        onRowClick={onRowClick}
        pagination={{
          pageSize,
          current: page,
          total: totalCount,
          onPageChange: handlePageChange,
        }}
      />
    </div>
  );
}

const LocalesBadge = styled.div`
  padding: 0px 8px;
  border-radius: 20px;
  background-color: ${colors.B30};
  color: ${colors.B60};
  font-size: 12px;
  font-style: normal;
  font-weight: 700;
  line-height: 20px;
`;

const FlagContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 20px;
  cursor: pointer;
`;
