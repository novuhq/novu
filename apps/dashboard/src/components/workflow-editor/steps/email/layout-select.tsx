import { EnvironmentTypeEnum } from '@novu/shared';
import { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { RiLayout5Line } from 'react-icons/ri';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/primitives/form/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchLayouts } from '@/hooks/use-fetch-layouts';
import { useSaveForm } from '../save-form-context';

export const LayoutSelect = () => {
  const { currentEnvironment } = useEnvironment();
  const { control } = useFormContext();
  const { data, isFetching } = useFetchLayouts({ limit: 100, refetchOnWindowFocus: false });
  const { saveForm } = useSaveForm();

  const layoutsSortedByDefault = useMemo(() => {
    if (!data?.layouts) return [];

    return data.layouts
      .sort((a, b) => {
        if (a.isDefault) return -1;
        if (b.isDefault) return 1;
        return 0;
      })
      .map((layout) => ({
        label: layout.isDefault ? `${layout.name} (Default)` : layout.name,
        value: layout.layoutId,
      }));
  }, [data]);

  return (
    <FormField
      control={control}
      name="layoutId"
      render={({ field }) => {
        return (
          <FormItem className="w-full">
            <FormControl>
              <Tooltip>
                <TooltipTrigger disabled={layoutsSortedByDefault?.length === 0}>
                  <Select
                    value={field.value ?? 'no_layout'}
                    onValueChange={(value) => {
                      const newValue = value === 'no_layout' ? null : value;
                      field.onChange(newValue);
                      saveForm({ forceSubmit: true });
                    }}
                    disabled={
                      isFetching ||
                      layoutsSortedByDefault?.length === 0 ||
                      currentEnvironment?.type !== EnvironmentTypeEnum.DEV
                    }
                  >
                    <SelectTrigger
                      size="2xs"
                      className="bg-bg-weak border-transparent hover:border-transparent hover:bg-neutral-100 [&_span]:text-neutral-600"
                    >
                      <RiLayout5Line className="text-text-soft mr-2 size-4" />
                      <SelectValue placeholder="Select layout" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no_layout" className="text-paragraph-xs">
                        No layout
                      </SelectItem>
                      {layoutsSortedByDefault.map((layout) => (
                        <SelectItem key={layout.value} value={layout.value} className="text-paragraph-xs">
                          {layout.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TooltipTrigger>
                {layoutsSortedByDefault?.length === 0 && <TooltipContent>No layouts found</TooltipContent>}
              </Tooltip>
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
};
