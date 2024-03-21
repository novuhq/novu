import { Controller, useFormContext } from 'react-hook-form';
import { Group } from '@mantine/core';
import { DigestTypeEnum } from '@novu/shared';

import { colors, Input, inputStyles } from '@novu/design-system';
import { IntervalSelect } from './digest/IntervalSelect';
import { BackOffFields } from './digest/BackOffFields';
import { useStepFormPath } from '../hooks/useStepFormPath';
import { useEnvController } from '../../../hooks';
import { useTemplateEditorForm } from '../components/TemplateEditorFormProvider';

const amountDefaultValue = '5';

export const RegularDigestMetadata = () => {
  const { template } = useTemplateEditorForm();
  const { readonly } = useEnvController({}, template?.chimera);
  const {
    control,
    formState: { errors, isSubmitted },
    setValue,
  } = useFormContext();
  const stepFormPath = useStepFormPath();

  const showErrors = isSubmitted && errors?.steps;
  const amountFieldName = `${stepFormPath}.digestMetadata.${DigestTypeEnum.REGULAR}.amount`;

  return (
    <>
      <Group spacing={8} sx={{ color: colors.B60 }}>
        <span>digest events for</span>
        <Controller
          control={control}
          name={amountFieldName}
          defaultValue={amountDefaultValue}
          render={({ field }) => {
            return (
              <Input
                {...field}
                value={field.value || ''}
                min={0}
                max={100}
                type="number"
                data-test-id="time-amount"
                placeholder="0"
                disabled={readonly}
                styles={(theme) => ({
                  ...inputStyles(theme),
                  input: {
                    textAlign: 'center',
                    ...inputStyles(theme).input,
                    minHeight: '30px',
                    margin: 0,
                    height: 30,
                    lineHeight: '32px',
                  },
                })}
                onBlur={(e) => {
                  if (e.target.value === '') {
                    setValue(amountFieldName, amountDefaultValue);
                  }
                  field.onBlur();
                }}
              />
            );
          }}
        />
        <div
          style={{
            width: '90px',
            height: 30,
          }}
        >
          <IntervalSelect
            readonly={readonly}
            control={control}
            name={`${stepFormPath}.digestMetadata.${DigestTypeEnum.REGULAR}.unit`}
            showErrors={showErrors}
          />
        </div>
        <span>before send</span>
      </Group>
      <BackOffFields />
    </>
  );
};
