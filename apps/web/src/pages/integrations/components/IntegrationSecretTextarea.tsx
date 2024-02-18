import { EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';
import { Grid, UnstyledButton } from '@mantine/core';
import { IConfigCredentials } from '@novu/shared';
import { useState } from 'react';
import { When } from '../../../components/utils/When';
import { Textarea } from '@novu/design-system';

export const IntegrationSecretTextarea = ({
  credential,
  errors,
  field,
  register,
}: {
  credential: IConfigCredentials;
  errors: any;
  field: any;
  register?: any;
}) => {
  const [hidden, setHidden] = useState(true);

  return (
    <Grid align="center">
      <Grid.Col span={11}>
        <When truthy={hidden}>
          <Textarea
            label={credential.displayName}
            required={credential.required}
            placeholder="*****************"
            description={
              credential.description ?? 'Click on the eye icon to edit and reveal the contents of this field'
            }
            data-test-id={credential.key}
            error={errors[credential.key]?.message}
            disabled
          />
        </When>
        <When truthy={!hidden}>
          <Textarea
            label={credential.displayName}
            required={credential.required}
            placeholder={credential.displayName}
            description={
              credential.description ?? 'Click on the eye icon to edit and reveal the contents of this field'
            }
            data-test-id={credential.key}
            error={errors[credential.key]?.message}
            {...field}
            {...register?.(credential.key, {
              required: credential.required && `Please enter a ${credential.displayName.toLowerCase()}`,
            })}
          />
        </When>
      </Grid.Col>
      <Grid.Col span={1}>
        <UnstyledButton
          sx={{
            fontSize: '20px',
          }}
          onClick={() => {
            setHidden(!hidden);
          }}
        >
          <When truthy={hidden}>
            <EyeOutlined size={20} />
          </When>
          <When truthy={!hidden}>
            <EyeInvisibleOutlined size={20} />
          </When>
        </UnstyledButton>
      </Grid.Col>
    </Grid>
  );
};
