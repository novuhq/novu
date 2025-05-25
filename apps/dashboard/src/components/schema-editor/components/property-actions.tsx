import { useState, useCallback } from 'react';
import { RiSettings4Line, RiDeleteBin6Line } from 'react-icons/ri';

import { Button } from '@/components/primitives/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/primitives/popover';
import { SchemaPropertySettingsPopover } from '../schema-property-settings-popover';
import type { VariableUsageInfo } from '../utils/check-variable-usage';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/primitives/tooltip';
import { cn } from '@/utils/ui';

type PropertyActionsProps = {
  definitionPath: string;
  propertyKeyForDisplay: string;
  isRequiredPath: string;
  onDeleteProperty: () => void;
  isDisabled?: boolean;
  variableUsageInfo?: VariableUsageInfo;
};

export function PropertyActions({
  definitionPath,
  propertyKeyForDisplay,
  isRequiredPath,
  onDeleteProperty,
  isDisabled = false,
  variableUsageInfo,
}: PropertyActionsProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showUsagePopover, setShowUsagePopover] = useState(false);

  const isVariableInUse = variableUsageInfo?.isUsed || false;
  const canDelete = !isDisabled && !isVariableInUse;

  const handleDeleteClick = () => {
    if (canDelete) {
      onDeleteProperty();
    } else if (isVariableInUse) {
      // Keep popover open when clicked
      setShowUsagePopover(true);
    }
  };

  const handleMouseEnter = () => {
    if (isVariableInUse) {
      setShowUsagePopover(true);
    }
  };

  const handleMouseLeave = () => {
    // Small delay to prevent flickering when moving between button and popover
    setTimeout(() => {
      setShowUsagePopover(false);
    }, 100);
  };

  const deleteButton = (
    <Button
      variant="error"
      mode="ghost"
      size="2xs"
      leadingIcon={RiDeleteBin6Line}
      onClick={handleDeleteClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      aria-label="Delete property"
      className={cn('p-1', !canDelete && 'cursor-not-allowed opacity-50')}
      aria-disabled={!canDelete}
    />
  );

  return (
    <>
      <Popover
        open={isSettingsOpen}
        onOpenChange={(open) => {
          console.log('open', open);
          setIsSettingsOpen(open);
        }}
      >
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
        <SchemaPropertySettingsPopover
          open={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
          definitionPath={definitionPath}
          propertyKeyForDisplay={propertyKeyForDisplay}
          isRequiredPath={isRequiredPath}
          onDeleteProperty={onDeleteProperty}
          variableUsageInfo={variableUsageInfo}
        />
      </Popover>

      {isVariableInUse ? (
        <Popover open={showUsagePopover} onOpenChange={setShowUsagePopover}>
          <PopoverTrigger asChild>{deleteButton}</PopoverTrigger>
          <PopoverContent
            side="left"
            className="max-w-xs"
            onMouseEnter={() => setShowUsagePopover(true)}
            onMouseLeave={() => setShowUsagePopover(false)}
          >
            <div className="space-y-2">
              <p className="font-medium">Variable in use</p>
              <p className="text-xs">
                This variable can't be deleted as it's being used in the step content of this workflow.
              </p>
              {variableUsageInfo && variableUsageInfo.usedInSteps.length > 0 && (
                <div className="text-xs">
                  <p className="mb-1 font-medium">Used in:</p>
                  <ul className="list-inside list-disc space-y-0.5">
                    {variableUsageInfo.usedInSteps.map((step) => (
                      <li key={step.stepId}>{step.stepName}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        deleteButton
      )}
    </>
  );
}
