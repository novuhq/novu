import { Group } from '@mantine/core';
import { Button } from '../../../design-system';

type LinkMoreProjectRowProps = {
  addMoreProjectRow: VoidFunction;
  disableMoreProjectsBtn: boolean;
};
export function LinkMoreProjectRow({ addMoreProjectRow, disableMoreProjectsBtn }: LinkMoreProjectRowProps) {
  return (
    <Group position="right">
      <Button variant="outline" onClick={addMoreProjectRow} disabled={disableMoreProjectsBtn}>
        Link more projects
      </Button>
    </Group>
  );
}
