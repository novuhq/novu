import { SelectItemProps, Group } from '@mantine/core';
import { Select, Text } from '@novu/design-system';
import { forwardRef } from 'react';
import { IS_DOCKER_HOSTED } from '../../../../config';

export function LocaleSelect({ locales, value, isLoading, onLocaleChange }) {
  if (IS_DOCKER_HOSTED || locales.length === 0) {
    return null;
  }

  return (
    <Select
      itemComponent={SelectItem}
      data={locales?.map((locale) => {
        return {
          value: locale.langIso,
          label: locale.langName,
        };
      })}
      icon={<FlagIcon locale={value} />}
      loading={isLoading}
      limit={50}
      searchable
      withinPortal
      onChange={(val) => {
        onLocaleChange(val);
      }}
      value={value}
      variant="unstyled"
    />
  );
}

const SelectItem = forwardRef<HTMLDivElement, SelectItemProps>(({ label, value, ...others }: SelectItemProps, ref) => {
  return (
    <Group ref={ref} noWrap {...others}>
      <FlagIcon locale={value} />
      <Text rows={1}> {label}</Text>
    </Group>
  );
});

export const FlagIcon = ({ locale }) => {
  if (IS_DOCKER_HOSTED) {
    return null;
  }

  try {
    const module = require('@novu/ee-translation-web');

    return module.FlagIcon({ locale });
  } catch (e) {}

  return [];
};
