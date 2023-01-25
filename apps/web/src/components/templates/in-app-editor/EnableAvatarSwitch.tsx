import { Group } from '@mantine/core';
import { Control, useController } from 'react-hook-form';
import { Text, Switch } from '../../../design-system';
import { IForm } from '../useTemplateController';

export function EnableAvatarSwitch({
  name,
  control,
  readonly,
}: {
  name: string;
  control: Control<IForm>;
  readonly: boolean;
}) {
  const {
    field: { onChange, value },
  } = useController({
    name: name as any,
    control,
    defaultValue: false,
  });

  return (
    <Group position="apart">
      <Text weight="bold">Add an Avatar</Text>
      <div>
        <Switch checked={value} onChange={onChange} disabled={readonly} />
      </div>
    </Group>
  );
}
