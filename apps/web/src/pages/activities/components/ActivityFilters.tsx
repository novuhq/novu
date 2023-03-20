import { useState } from 'react';
import styled from '@emotion/styled';
import { MultiSelect, TextInput, Group } from '@mantine/core';
import { Calendar } from '../../../design-system/icons';
import { DateRangePicker, DateRangePickerValue } from '@mantine/dates';
import { useDebounce } from '../../../hooks';

export function ActivityFilters({ filterState, onFiltersChange, templates }) {
  const debouncedTransactionIdChange = useDebounce((transactionId: string) => {
    onFiltersChange({ transactionId });
  }, 500);

  const debouncedSearchChange = useDebounce((search: string) => {
    onFiltersChange({ search });
  }, 500);

  const onDateChange = (value: DateRangePickerValue) => {
    if (value[0] && value[1]) onFiltersChange({ range: value });
  };

  return (
    <Group sx={{ padding: 10 }} position="center">
      <div style={{ minWidth: '210px' }}>
        <DateRangePicker
          maxDate={new Date()}
          inputFormat="MMM DD, YYYY"
          placeholder="Pick dates range"
          value={filterState.range}
          onChange={onDateChange}
          icon={<Calendar width={18} height={18} />}
          clearable={false}
          allowSingleDateInRange={false}
        />
      </div>
      <div style={{ minWidth: '210px' }}>
        <MultiSelect
          type="multiselect"
          data-test-id="templates-filter"
          searchable
          placeholder="Select template"
          data={(templates || []).map((template) => ({ value: template._id as string, label: template.name }))}
          value={filterState.templates}
          onChange={(value) => {
            onFiltersChange({ templates: value });
          }}
        />
      </div>
      <div style={{ minWidth: '210px' }}>
        <TextInput
          placeholder="Search by transaction id"
          onChange={(e) => {
            debouncedTransactionIdChange(e.target.value);
          }}
          data-test-id="transactionId-filter"
        />
      </div>
      <div style={{ minWidth: '210px' }}>
        <TextInput
          placeholder="Search Email or ID"
          onChange={(e) => {
            debouncedSearchChange(e.target.value);
          }}
          data-test-id="search-filter"
        />
      </div>
    </Group>
  );
}

const FiltersContainer = styled.div`
  border: 3;
  display: flex;
  align-items: center;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 15px;
  padding: 15px;
`;
