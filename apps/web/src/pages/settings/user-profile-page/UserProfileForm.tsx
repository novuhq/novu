import { ChangeEventHandler, FC } from 'react';
import { SubmitHandler, useController, useForm, ValidationRule } from 'react-hook-form';
import * as capitalize from 'lodash.capitalize';
import { Button, errorMessage, Input, successMessage } from '@novu/design-system';
import { IUserEntity, UploadTypesEnum } from '@novu/shared';

import { css } from '../../../styled-system/css';
import { ProfileImage } from '../../../components/shared';
import { useUpdateUserProfile } from '../../../api/hooks';
import { useUploadToStorage } from '../../../api/hooks/useUploadToStorage';

interface IUserProfileForm {
  firstName: string;
  lastName: string;
  profilePicture?: string;
}

interface IUserProfileFormProps {
  currentUser?: IUserEntity | null;
}

const formInputStyles = css({
  minWidth: '10rem',
  '& label': { marginTop: '0 !important' },
  /**
   * show the error message absolutely positioned below the input, otherwise it will push the input up
   */
  '& .mantine-TextInput-error': { position: 'absolute', marginTop: '50' },
  '& input, .mantine-TextInput-wrapper': { marginBottom: '0 !important', textOverflow: 'ellipsis' },
});

const FIRST_NAME_LABEL = 'First name';
const LAST_NAME_LABEL = 'Last name';
const MIN_LENGTH_RULE: ValidationRule<number> = { value: 2, message: 'Should be longer than 2 characters' };

const makeFormData = (data?: IUserEntity | null): IUserProfileForm => ({
  firstName: capitalize(data?.firstName ?? ''),
  lastName: capitalize(data?.lastName ?? ''),
  profilePicture: data?.profilePicture ?? '',
});

export const UserProfileForm: FC<IUserProfileFormProps> = ({ currentUser }) => {
  const {
    control,
    register,
    reset,
    handleSubmit,
    setValue,
    formState: { isDirty, errors },
  } = useForm<IUserProfileForm>({
    mode: 'onSubmit',
    defaultValues: makeFormData(currentUser),
  });
  const { field: profilePictureField } = useController({ name: 'profilePicture', control });

  const { updateUserProfile, isLoading: isUpdatingUserProfile } = useUpdateUserProfile({
    onSuccess: (newUserData) => {
      successMessage('Profile updated successfully');
      reset(makeFormData(newUserData));
    },
    onError: (e) => {
      errorMessage('Failed to update profile: ' + e.message);
    },
  });

  const { uploadToStorage, isLoading: isUploadingImage } = useUploadToStorage({
    onError: (e) => {
      errorMessage('Failed to upload profile image: ' + e.message);
    },
  });

  const uploadProfileImage = async (objectUrl: string): Promise<string> => {
    const blob = await fetch(objectUrl).then((el) => el.blob());
    const path = await uploadToStorage({
      file: new File([blob], 'profile', { type: blob.type }),
      type: UploadTypesEnum.USER_PROFILE,
    });
    URL.revokeObjectURL(objectUrl);

    return path;
  };

  const onUpdateUserProfileHandler: SubmitHandler<IUserProfileForm> = async (data) => {
    const objectUrl = data.profilePicture;
    let path: string | undefined;
    if (objectUrl && objectUrl.startsWith('blob:')) {
      path = await uploadProfileImage(objectUrl);
    }

    updateUserProfile({ ...data, profilePicture: path });
  };

  const onUpdateUserProfileImageHandler: ChangeEventHandler<HTMLInputElement> = (event) => {
    const {
      target: { files },
    } = event;
    if (!files || !files[0]) {
      return;
    }

    const path = URL.createObjectURL(files[0]);
    setValue('profilePicture', path, { shouldDirty: true });
  };

  const isLoading = isUpdatingUserProfile || isUploadingImage;

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onUpdateUserProfileHandler)}
      // TODO: update with proper token value for marginBottom: 250
      className={css({ display: 'flex', alignItems: 'flex-end', gap: '150', marginBottom: '2.5rem' })}
    >
      <ProfileImage {...profilePictureField} onChange={onUpdateUserProfileImageHandler} isDisabled={isLoading} />
      <Input
        className={formInputStyles}
        {...register('firstName', {
          required: `${FIRST_NAME_LABEL} is required`,
          minLength: MIN_LENGTH_RULE,
        })}
        error={errors.firstName?.message}
        label={FIRST_NAME_LABEL}
      />
      <Input
        className={formInputStyles}
        {...register('lastName', {
          required: `${LAST_NAME_LABEL} is required`,
          minLength: MIN_LENGTH_RULE,
        })}
        error={errors.lastName?.message}
        label={LAST_NAME_LABEL}
      />
      <Button
        size="lg"
        type="submit"
        className={css({ alignSelf: 'flex-end' })}
        disabled={!isDirty || isLoading}
        loading={isLoading}
      >
        Update
      </Button>
    </form>
  );
};
