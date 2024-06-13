import React, { forwardRef, useMemo } from 'react';
import { Group, SelectItemProps } from '@mantine/core';
import { Text } from '@novu/design-system';
import { FlagMap } from '../icons/flags';

export interface ICreateGroup {
  name: string;
  identifier: string;
  locales: string[];
}

export interface ILocale {
  name: string;
  officialName: string | null;
  numeric: string;
  alpha2: string;
  alpha3: string;
  currencyName: string | null;
  currencyAlphabeticCode: string | null;
  langName: string;
  langIso: string;
}
export const FlagIcon = ({ locale, width = 16, height = 16 }: { locale: string; width?: number; height?: number }) => {
  const Icon = useMemo(() => {
    return FlagMap[locale];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, FlagMap]);

  return Icon ? <Icon width={width} height={height} viewBox="0 0 40 40" /> : null;
};

export const SelectItem = forwardRef<HTMLDivElement, SelectItemProps>(
  ({ label, value, ...others }: SelectItemProps, ref) => {
    return (
      <Group ref={ref} noWrap {...others}>
        <FlagIcon locale={value || ''} />
        <Text>{label}</Text>
      </Group>
    );
  }
);
