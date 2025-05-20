import { useState, useCallback } from 'react';
import { RiSettings4Line, RiDeleteBin6Line } from 'react-icons/ri';

import { Button } from '@/components/primitives/button';
import { Popover, PopoverTrigger } from '@/components/primitives/popover';
import { SchemaPropertySettingsPopover } from '../schema-property-settings-popover';

type PropertyActionsProps = {
  definitionPath: string;
  propertyKeyForDisplay: string;
  isRequiredPath: string;
  onDeleteProperty: () => void;
  isDisabled?: boolean;
};

export function PropertyActions({
  definitionPath,
  propertyKeyForDisplay,
  isRequiredPath,
  onDeleteProperty,
  isDisabled = false,
}: PropertyActionsProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <>
      <Popover open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="secondary"
            mode="ghost"
            size="2xs"
            className="p-1"
            leadingIcon={RiSettings4Line}
            disabled={isDisabled || !propertyKeyForDisplay || propertyKeyForDisplay.trim() === ''}
            aria-label="Property settings"
          />
        </PopoverTrigger>
        {isSettingsOpen && (
          <SchemaPropertySettingsPopover
            open={isSettingsOpen}
            onOpenChange={setIsSettingsOpen}
            definitionPath={definitionPath}
            propertyKeyForDisplay={propertyKeyForDisplay}
            isRequiredPath={isRequiredPath}
            onDeleteProperty={onDeleteProperty}
          />
        )}
      </Popover>
      <Button
        variant="error"
        mode="ghost"
        size="2xs"
        leadingIcon={RiDeleteBin6Line}
        onClick={onDeleteProperty}
        aria-label="Delete property"
        className="p-1"
      />
    </>
  );
}
