import { FC } from 'react';
import { SubmitHandler, useForm, ValidationRule } from 'react-hook-form';
import * as capitalize from 'lodash.capitalize';
import { Button, errorMessage, Input, successMessage } from '@novu/design-system';
import type { IUserEntity } from '@novu/shared';

import { css } from '../../../styled-system/css';
import { ProfileImage } from '../../../components/shared';
import { useUpdateUserProfile } from '../../../api/hooks';

interface IUserProfileForm {
  firstName: string;
  lastName: string;
}

interface IUserProfileFormProps {
  currentUser?: IUserEntity | null;
}

const formInputStyles = css({
  minWidth: '18.75rem',
  '& label': { marginTop: '0 !important' },
  /**
   * show the error message absolutely positioned below the input, otherwise it will push the input up
   */
  '& .mantine-TextInput-error': { position: 'absolute', marginTop: '0.5rem' },
  '& input, .mantine-TextInput-wrapper': { marginBottom: '0 !important' },
});

const FIRST_NAME_LABEL = 'First name';
const LAST_NAME_LABEL = 'Last name';
const MIN_LENGTH_RULE: ValidationRule<number> = { value: 2, message: 'Should be longer than 2 characters' };

const makeFormData = (data?: IUserEntity | null): IUserProfileForm => ({
  firstName: capitalize(data?.firstName ?? ''),
  lastName: capitalize(data?.lastName ?? ''),
});

export const UserProfileForm: FC<IUserProfileFormProps> = ({ currentUser }) => {
  const {
    register,
    reset,
    handleSubmit,
    formState: { isDirty, errors },
  } = useForm<IUserProfileForm>({
    mode: 'onSubmit',
    defaultValues: makeFormData(currentUser),
  });

  const { updateUserProfile, isLoading: isUpdatingUserProfile } = useUpdateUserProfile({
    onSuccess: (newUserData) => {
      successMessage('Profile updated successfully');
      reset(makeFormData(newUserData));
    },
    onError: (e) => {
      errorMessage('Failed to update profile: ' + e.message);
    },
  });

  const onUpdateUserProfileHandler: SubmitHandler<IUserProfileForm> = ({ firstName, lastName }) => {
    updateUserProfile({ firstName, lastName });
  };

  const onUpdateUserProfileImageHandler = async (_: File[]) => {
    // TODO: Implement image upload
  };

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onUpdateUserProfileHandler)}
      className={css({ display: 'flex', alignItems: 'flex-end', gap: '150', marginBottom: '2.5rem' })}
    >
      <ProfileImage
        name="Profile picture"
        onChange={onUpdateUserProfileImageHandler}
        value={currentUser?.profilePicture}
      />
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
        disabled={!isDirty || isUpdatingUserProfile}
        loading={isUpdatingUserProfile}
      >
        Update
      </Button>
    </form>
  );
};
