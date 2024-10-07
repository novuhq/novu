import styled from '@emotion/styled';
import { SelectItemProps, Group } from '@mantine/core';
import { Select, ISelectProps, Text } from '@novu/design-system';
import { forwardRef } from 'react';
import { IS_SELF_HOSTED } from '../../../../config';
import { FlagIcon } from '../../../../ee/translations';

const rightSectionWidth = 20;

export function LocaleSelect({
  locales,
  value,
  isLoading,
  onLocaleChange,
  className,
  dropdownPosition,
}: {
  locales: { langName: string; langIso: string }[];
  value?: string;
  isLoading?: boolean;
  onLocaleChange: (val: string) => void;
  className?: string;
  dropdownPosition?: ISelectProps['dropdownPosition'];
}) {
  // Do not render locale select if self-hosted or no locale or only one locale
  if (IS_SELF_HOSTED || locales.length < 2) {
    return null;
  }

  return (
    <SelectContainer className={className}>
      <Select
        itemComponent={SelectItem}
        data={locales?.map((locale) => {
          return {
            value: locale.langIso,
            label: locale.langName,
          };
        })}
        icon={value && <FlagIcon locale={value} />}
        loading={isLoading}
        limit={50}
        searchable
        withinPortal
        onChange={(val) => {
          if (!val || Array.isArray(val)) return;

          onLocaleChange(val);
        }}
        value={value}
        variant="unstyled"
        rightSectionWidth={rightSectionWidth}
        dropdownPosition={dropdownPosition}
      />
    </SelectContainer>
  );
}

const SelectItem = forwardRef<HTMLDivElement, SelectItemProps>(({ label, value, ...others }: SelectItemProps, ref) => {
  return (
    <Group ref={ref} noWrap {...others}>
      {value && <FlagIcon locale={value} />}
      <Text rows={1}> {label}</Text>
    </Group>
  );
});

const SelectContainer = styled.div`
  .mantine-Select-input {
    padding-right: ${rightSectionWidth}px;
  }
`;
