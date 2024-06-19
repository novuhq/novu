import { createStyles, Group, Stack } from '@mantine/core';
import { colors, Label, Popover, Text, Select } from '@novu/design-system';

import React, { useState } from 'react';
import { Control, Controller, useWatch } from 'react-hook-form';
import { useFetchLocales } from '../../hooks';
import { TranslateIcon } from '../../icons';
import { LocalesFormSchema } from '../EditTranslationsSidebar';
import { FlagIcon, SelectItem } from '../shared';
import { useEnvironment } from '../../../../hooks';

type Props = {
  control: Control<LocalesFormSchema>;
  index: number;
};
export function LanguageSelect({ control, index }: Props) {
  const { classes } = useStyles();
  const { locales, isLoading } = useFetchLocales();

  const formLocales = useWatch({
    control,
    name: `formLocales`,
  });

  const isDuplicate = formLocales?.some((locale, i) => {
    return locale?.locale === formLocales[index]?.locale && i !== index;
  });

  const [isHovered, setIsHovered] = useState(false);

  const handleHover = (hoverState: boolean) => {
    setIsHovered(hoverState);
  };

  const { readonly } = useEnvironment();

  if (!locales) {
    return null;
  }

  return (
    <Popover
      withinPortal
      target={
        <div onMouseEnter={() => handleHover(true)} onMouseLeave={() => handleHover(false)}>
          <Controller
            name={`formLocales.${index}.locale`}
            control={control}
            rules={{
              required: 'Select a locale',
            }}
            render={({ field }) => {
              return (
                <Select
                  inputProps={{
                    error: isDuplicate,
                    miw: 180,
                  }}
                  itemComponent={SelectItem}
                  data={locales.map((locale) => {
                    return {
                      value: locale.langIso,
                      label: locale.langName,
                    };
                  })}
                  icon={<FlagIcon locale={field.value} />}
                  loading={isLoading}
                  searchable
                  withinPortal
                  disabled={readonly}
                  {...field}
                />
              );
            }}
          />
        </div>
      }
      content={<PopoverContent />}
      classNames={classes}
      position="left"
      opened={isHovered && isDuplicate}
      middlewares={{ flip: false, shift: false }}
    />
  );
}

const PopoverContent = () => {
  return (
    <Stack spacing={10}>
      <Group spacing={8} align="center">
        <TranslateIcon />
        <Label color={colors.error} gradientColor="none">
          Select different language
        </Label>
      </Group>
      <Text color={colors.error}>
        Uploading multiple files to the same language is restricted. Please select different languages for each of the
        uploaded files.
      </Text>
    </Stack>
  );
};

const useStyles = createStyles(() => ({
  dropdown: {
    padding: '16px',
    color: colors.error,
    border: 'none',
    maxWidth: '320px',
    background: 'linear-gradient(0deg, rgba(229, 69, 69, 0.20) 0%, rgba(229, 69, 69, 0.20) 100%), #23232B',
  },
  arrow: {
    width: '7px',
    height: '7px',
    margin: '0px',
    background: 'linear-gradient(0deg, rgba(229, 69, 69, 0.20) 0%, rgba(229, 69, 69, 0.20) 100%), #23232B',
  },
}));
