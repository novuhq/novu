import { Button, LoadingOverlay } from '@novu/design-system';
import { useForm } from 'react-hook-form';
import { css } from '@novu/novui/css';
import { Stack } from '@novu/novui/jsx';
import { useEffect } from 'react';
import { useUpdateOrganizationBranding, useFetchOrganization } from '../../api/hooks';
import { useAuth } from '../../hooks/useAuth';
import { successMessage } from '../../utils/notifications';
import { SettingsPageContainer } from '../settings/SettingsPageContainer';
import {
  DEFAULT_BRANDING_COLOR,
  DEFAULT_FONT_COLOR,
  DEFAULT_FONT_FAMILY,
  IBrandFormValues,
} from './BrandingPage.const';
import { BrandInputs } from './BrandInputs';
import { InAppInputs } from './InAppInputs';

export function BrandingPage() {
  const { currentOrganization } = useAuth();
  const { data: organizationData, isLoading: isLoadingOrganization } = useFetchOrganization();

  const {
    setValue,
    handleSubmit,
    control,
    reset,
    formState: { isDirty },
  } = useForm<IBrandFormValues>({
    defaultValues: {
      fontFamily: DEFAULT_FONT_FAMILY,
      color: DEFAULT_BRANDING_COLOR,
      fontColor: DEFAULT_FONT_COLOR,
      logo: '',
      file: null,
    },
  });

  // Update form values when organization data is loaded
  useEffect(() => {
    if (organizationData?.branding) {
      const branding = organizationData.branding;

      reset({
        fontFamily: branding.fontFamily || DEFAULT_FONT_FAMILY,
        color: branding.color || DEFAULT_BRANDING_COLOR,
        fontColor: branding.fontColor || DEFAULT_FONT_COLOR,
        logo: branding.logo || '',
        file: null,
      });
    }
  }, [organizationData, reset]);

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
      <LoadingOverlay visible={!currentOrganization || isLoadingOrganization}>
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
