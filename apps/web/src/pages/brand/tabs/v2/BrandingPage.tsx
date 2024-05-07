import { Button, LoadingOverlay } from '@novu/design-system';
import { useAuthContext } from '@novu/shared-web';
import { useForm } from 'react-hook-form';
import { useUpdateOrganizationBranding } from '../../../../api/hooks';
import { css } from '../../../../styled-system/css';
import { Stack } from '../../../../styled-system/jsx';
import { successMessage } from '../../../../utils/notifications';
import { SettingsPageContainer } from '../../../settings/SettingsPageContainer';
import {
  DEFAULT_BRANDING_COLOR,
  DEFAULT_FONT_COLOR,
  DEFAULT_FONT_FAMILY,
  IBrandFormValues,
} from './BrandingPage.const';
import { BrandInputs } from './BrandInputs';
import { InAppInputs } from './InAppInputs';

export function BrandingPage() {
  const { currentOrganization: organization } = useAuthContext();

  const {
    setValue,
    handleSubmit,
    control,
    reset,
    formState: { isDirty },
  } = useForm<IBrandFormValues>({
    defaultValues: {
      fontFamily: organization?.branding?.fontFamily || DEFAULT_FONT_FAMILY,
      color: organization?.branding?.color || DEFAULT_BRANDING_COLOR,
      fontColor: organization?.branding?.fontColor || DEFAULT_FONT_COLOR,
      logo: organization?.branding?.logo || '',
      file: null,
    },
  });

  const { isLoading, updateOrganizationBranding } = useUpdateOrganizationBranding({
    onSuccess: (data) => {
      successMessage('Branding info updated successfully');

      reset({
        fontFamily: data.fontFamily || DEFAULT_FONT_FAMILY,
        color: data.color || DEFAULT_BRANDING_COLOR,
        fontColor: data.fontColor || DEFAULT_FONT_COLOR,
        logo: data.logo || '',
        file: null,
      });
    },
  });

  const saveBrandsForm = async (data: IBrandFormValues) => {
    await updateOrganizationBranding(data);
  };

  return (
    <SettingsPageContainer title="Branding">
      <LoadingOverlay visible={!organization}>
        <form noValidate onSubmit={handleSubmit(saveBrandsForm)}>
          <Stack gap="200">
            <BrandInputs control={control} setValue={setValue} />
            <InAppInputs control={control} />
            <Button
              className={css({ alignSelf: 'flex-start' })}
              submit
              loading={isLoading}
              data-test-id="submit-branding-settings"
              disabled={!isDirty}
            >
              Update
            </Button>
          </Stack>
        </form>
      </LoadingOverlay>
    </SettingsPageContainer>
  );
}
