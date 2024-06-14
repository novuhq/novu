import { ActionIcon, FileButton, Group } from '@mantine/core';
import { ArrowDown, ChevronDown, ChevronUp, colors, Tooltip, Trash } from '@novu/design-system';
import React from 'react';
import { ChevronDownIcon, ChevronUpIcon, ReuploadIcon } from '../../icons';

export function AccordionRowActionTools({ setAccordionValue, value, accordionValue, removeRow, index, replaceRow }) {
  const handleReplaceRow = (file: File | null) => {
    replaceRow(index, file);
  };

  return (
    <Group align="center" spacing={20} noWrap>
      <Tooltip label="Replace file" withinPortal>
        <div>
          <FileButton onChange={handleReplaceRow} accept="application/json" name="files">
            {(props) => (
              <ActionIcon variant="transparent" {...props} title="Replace file">
                <ReuploadIcon color={colors.B60} />
              </ActionIcon>
            )}
          </FileButton>
        </div>
      </Tooltip>
      <Tooltip label="Remove" withinPortal>
        <div>
          <ActionIcon variant="transparent" onClick={() => removeRow(index)} title="Remove">
            <Trash color={colors.B60} />
          </ActionIcon>
        </div>
      </Tooltip>
      <div>
        <ActionIcon variant="transparent" onClick={() => setAccordionValue(value)}>
          {accordionValue === value ? <ChevronUpIcon color={colors.B60} /> : <ChevronDownIcon color={colors.B60} />}
        </ActionIcon>
      </div>
    </Group>
  );
}
