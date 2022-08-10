import { Grid, InputWrapper } from '@mantine/core';
import { useEnvController } from '../../../store/use-env-controller';
import { inputStyles } from '../../../design-system/config/inputs.styles';
import { Checkbox } from '../../../design-system';

export function TemplatePreference({ value, onChange }) {
  const { readonly } = useEnvController();
  const preferences = value;

  const mock = { channel: true };
  const data = preferences ? preferences : mock;

  function handleCheckboxChange(e, channelType) {
    const newData = Object.assign({}, preferences);
    newData[channelType] = e.currentTarget.checked;
    onChange(newData);
  }

  return (
    <InputWrapper label="Template default" description="Description here" styles={inputStyles}>
      <Grid pt={8.5}>
        {Object.keys(data).map((key) => {
          return (
            <Grid.Col span={3}>
              <Checkbox
                checked={data[key] || false}
                disabled={readonly}
                data-test-id={`preference-${key}`}
                label={key}
                onChange={(e) => handleCheckboxChange(e, key)}
              />
            </Grid.Col>
          );
        })}
      </Grid>
    </InputWrapper>
  );
}
