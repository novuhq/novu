import { Group } from '@mantine/core';
import { Button } from '../../../design-system';
import { PlusCircle } from '../../../design-system/icons';

type LinkMoreProjectRowProps = {
  addMoreProjectRow: VoidFunction;
  disableMoreProjectsBtn: boolean;
};
export function LinkMoreProjectRow({ addMoreProjectRow, disableMoreProjectsBtn }: LinkMoreProjectRowProps) {
  return (
    <Group position="center">
      <Button variant="outline" onClick={addMoreProjectRow} disabled={disableMoreProjectsBtn} icon={<PlusCircle />}>
        Add more projects
      </Button>
    </Group>
  );
}
