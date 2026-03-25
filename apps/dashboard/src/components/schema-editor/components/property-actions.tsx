import { useState } from 'react';
import { RiDeleteBin2Line, RiSettings4Line } from 'react-icons/ri';

import { Button } from '@/components/primitives/button';
import { Popover, PopoverTrigger } from '@/components/primitives/popover';
import { cn } from '@/utils/ui';
import { SchemaPropertySettingsPopover } from '../schema-property-settings-popover';
import type { VariableUsageInfo } from '../utils/check-variable-usage';

type PropertyActionsProps = {
  definitionPath: string;
  propertyKeyForDisplay: string;
  isRequiredPath: string;
  isNullablePath: string;
  onDeleteProperty: () => void;
  isDisabled?: boolean;
  isDeleteDisabled?: boolean;
  variableUsageInfo?: VariableUsageInfo;
};

export function PropertyActions({
  definitionPath,
  propertyKeyForDisplay,
  isRequiredPath,
  isNullablePath,
  onDeleteProperty,
  isDisabled = false,
  isDeleteDisabled = false,
  variableUsageInfo,
}: PropertyActionsProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <>
      <Popover open={isSettingsOpen} onOpenChange={setIsSettingsOpen} modal={false}>
        <PopoverTrigger asChild>
          <Button
            variant="secondary"
            mode="ghost"
            size="2xs"
            className={cn('border ml-0! h-7 w-7 border-neutral-200')}
            leadingIcon={RiSettings4Line}
            disabled={isDisabled || !propertyKeyForDisplay || propertyKeyForDisplay.trim() === ''}
            aria-label="Property settings"
          />
        </PopoverTrigger>
        <SchemaPropertySettingsPopover
          open={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
          definitionPath={definitionPath}
          propertyKeyForDisplay={propertyKeyForDisplay}
          isRequiredPath={isRequiredPath}
          isNullablePath={isNullablePath}
          onDeleteProperty={onDeleteProperty}
          variableUsageInfo={variableUsageInfo}
        />
      </Popover>
      <Button
        variant="error"
        mode="ghost"
        size="2xs"
        leadingIcon={RiDeleteBin2Line}
        onClick={isDeleteDisabled ? undefined : onDeleteProperty}
        aria-label="Delete property"
        className={cn('border ml-0! h-7 w-7 border-neutral-200')}
        disabled={isDeleteDisabled}
      />
    </>
  );
}
