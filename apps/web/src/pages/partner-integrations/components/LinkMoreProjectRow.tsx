import { Group } from '@mantine/core';
import { Button, PlusCircle } from '@novu/design-system';

type LinkMoreProjectRowProps = {
  addMoreProjectRow: VoidFunction;
  disableMoreProjectsBtn: boolean;
  organizationLength: number;
};
export function LinkMoreProjectRow({
  addMoreProjectRow,
  disableMoreProjectsBtn,
  organizationLength,
}: LinkMoreProjectRowProps) {
  return (
    <Group position="center">
      <Button variant="outline" onClick={addMoreProjectRow} disabled={disableMoreProjectsBtn} icon={<PlusCircle />}>
        Link more organizations ({organizationLength} available)
      </Button>
    </Group>
  );
}
