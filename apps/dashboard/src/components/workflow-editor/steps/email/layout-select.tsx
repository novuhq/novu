import { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';

import { FormControl, FormField, FormItem, FormMessage } from '@/components/primitives/form/form';
import { useFetchLayouts } from '@/hooks/use-fetch-layouts';
import { FacetedFormFilter } from '@/components/primitives/form/faceted-filter/facated-form-filter';
import { RiExpandUpDownLine, RiLayout5Line } from 'react-icons/ri';
import { useSaveForm } from '../save-form-context';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';

export const LayoutSelect = () => {
  const { control } = useFormContext();
  const { data, isFetching } = useFetchLayouts({ limit: 100, refetchOnWindowFocus: false });
  const { saveForm } = useSaveForm();

  const layoutsSortedByDefault = useMemo(() => {
    return data?.layouts
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
                <TooltipTrigger
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                >
                  <FacetedFormFilter
                    type="single"
                    size="small"
                    title="Layout"
                    icon={RiLayout5Line}
                    placeholder="Search layout"
                    className="bg-bg-weak border-transparent hover:border-transparent hover:bg-neutral-100 [&_span]:text-neutral-600"
                    selected={field.value ? [field.value] : undefined}
                    disabled={isFetching || layoutsSortedByDefault?.length === 0}
                    hidePlusIcon
                    options={layoutsSortedByDefault}
                    onSelect={(value) => {
                      if (value.length > 0) {
                        field.onChange(value[0]);
                        return;
                      }

                      field.onChange(null);
                      saveForm({ forceSubmit: true });
                    }}
                    trailingNode={<RiExpandUpDownLine className="text-text-soft size-3" />}
                  />
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
