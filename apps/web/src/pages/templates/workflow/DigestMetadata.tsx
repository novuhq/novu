import { Controller } from 'react-hook-form';
import { Input, Select } from '../../../design-system';
import { useEnvController } from '../../../store/use-env-controller';

export const DigestMetadata = ({ control, index }) => {
  const { readonly } = useEnvController();

  return (
    <>
      <Controller
        control={control}
        name={`steps.${index}.metadata.unit`}
        render={({ field }) => {
          return (
            <Select
              disabled={readonly}
              label="Time unit"
              placeholder="Time unit"
              data={[
                { value: 'minutes', label: 'Minutes' },
                { value: 'hours', label: 'Hours' },
                { value: 'days', label: 'Days' },
              ]}
              data-test-id="time-unit"
              {...field}
            />
          );
        }}
      />
      <Controller
        control={control}
        name={`steps.${index}.metadata.amount`}
        render={({ field }) => {
          return <Input {...field} min={0} max={100} type="number" />;
        }}
      />
    </>
  );
};
