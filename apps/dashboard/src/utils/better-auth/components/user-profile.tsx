import * as React from 'react';
import { useState } from 'react';
import {
  RiEdit2Line,
  RiLoader4Line,
  RiLockPasswordLine,
  RiMailLine,
  RiShieldKeyholeLine,
  RiUser3Line,
} from 'react-icons/ri';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/primitives/avatar';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { authClient } from '../client';
import { useAuth, useUser } from '../index';

function getUserInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function ProfileSection() {
  const { user } = useUser();
  const { refreshSession } = useAuth();
  const [isEditingName, setIsEditingName] = useState(false);
  const [name, setName] = useState(user?.fullName || '');
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [email, setEmail] = useState(user?.primaryEmailAddress?.emailAddress || '');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name === user?.fullName) {
      setIsEditingName(false);

      return;
    }

    setIsUpdatingName(true);
    try {
      const { error } = await authClient.updateUser({
        name: name.trim(),
      });

      if (error) {
        throw new Error(error.message || 'Failed to update name');
      }

      await refreshSession();
      showSuccessToast('Name updated successfully', 'Profile Updated');
      setIsEditingName(false);
    } catch (e: any) {
      console.error('Failed to update name:', e);
      showErrorToast(e.message || 'Failed to update name', 'Update Error');
      setName(user?.fullName || '');
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || email === user?.primaryEmailAddress?.emailAddress) {
      setIsEditingEmail(false);

      return;
    }

    setIsUpdatingEmail(true);
    try {
      const { error } = await authClient.changeEmail({
        newEmail: email.trim(),
        callbackURL: window.location.origin + '/settings/account',
      });

      if (error) {
        throw new Error(error.message || 'Failed to change email');
      }

      showSuccessToast(
        'Verification email sent. Please check your new email address to confirm the change.',
        'Email Change Initiated'
      );
      setIsEditingEmail(false);
    } catch (e: any) {
      console.error('Failed to change email:', e);
      showErrorToast(e.message || 'Failed to change email', 'Update Error');
      setEmail(user?.primaryEmailAddress?.emailAddress || '');
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-100 pb-4">
        <h2 className="text-lg font-semibold text-foreground-950">Profile</h2>
        <p className="mt-1 text-sm text-foreground-600">Manage your account information</p>
      </div>

      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={user.imageUrl} alt={user.fullName || ''} />
          <AvatarFallback className="bg-primary-base text-static-white text-lg">
            {getUserInitials(user.fullName || user.primaryEmailAddress?.emailAddress || 'U')}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="text-base font-medium text-foreground-950">{user.fullName}</span>
          <span className="text-sm text-foreground-600">{user.primaryEmailAddress?.emailAddress}</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <RiUser3Line className="size-5 text-foreground-600" />
            <h3 className="text-sm font-medium text-foreground-950">Full Name</h3>
          </div>

          {isEditingName ? (
            <form onSubmit={handleUpdateName} className="space-y-3">
              <Input
                type="text"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                placeholder="Enter your full name"
                required
                disabled={isUpdatingName}
                className="h-10"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={isUpdatingName || !name.trim()}
                  variant="primary"
                  mode="filled"
                  size="sm"
                  className="h-9"
                >
                  {isUpdatingName ? <RiLoader4Line className="size-4 animate-spin" /> : 'Save'}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setIsEditingName(false);
                    setName(user.fullName || '');
                  }}
                  disabled={isUpdatingName}
                  variant="secondary"
                  mode="outline"
                  size="sm"
                  className="h-9"
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground-950">{user.fullName}</span>
              <Button
                onClick={() => setIsEditingName(true)}
                variant="secondary"
                mode="ghost"
                size="sm"
                className="h-8 gap-1.5"
              >
                <RiEdit2Line className="size-4" />
                Edit
              </Button>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <RiMailLine className="size-5 text-foreground-600" />
            <h3 className="text-sm font-medium text-foreground-950">Email Address</h3>
          </div>

          {isEditingEmail ? (
            <form onSubmit={handleUpdateEmail} className="space-y-3">
              <Input
                type="email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                disabled={isUpdatingEmail}
                className="h-10"
                autoFocus
              />
              <p className="text-xs text-foreground-600">
                You will receive a verification email at the new address to confirm the change.
              </p>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={isUpdatingEmail || !email.trim()}
                  variant="primary"
                  mode="filled"
                  size="sm"
                  className="h-9"
                >
                  {isUpdatingEmail ? <RiLoader4Line className="size-4 animate-spin" /> : 'Change Email'}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setIsEditingEmail(false);
                    setEmail(user.primaryEmailAddress?.emailAddress || '');
                  }}
                  disabled={isUpdatingEmail}
                  variant="secondary"
                  mode="outline"
                  size="sm"
                  className="h-9"
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground-950">{user.primaryEmailAddress?.emailAddress}</span>
              <Button
                onClick={() => setIsEditingEmail(true)}
                variant="secondary"
                mode="ghost"
                size="sm"
                className="h-8 gap-1.5"
              >
                <RiEdit2Line className="size-4" />
                Edit
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SecuritySection() {
  const { user } = useUser();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const currentPasswordId = React.useId();
  const newPasswordId = React.useId();
  const confirmPasswordId = React.useId();

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      showErrorToast('New password and confirmation do not match', 'Password Mismatch');

      return;
    }

    if (newPassword.length < 8) {
      showErrorToast('Password must be at least 8 characters long', 'Invalid Password');

      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: false,
      });

      if (error) {
        throw new Error(error.message || 'Failed to change password');
      }

      showSuccessToast('Password changed successfully', 'Password Updated');
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      console.error('Failed to change password:', e);
      showErrorToast(e.message || 'Failed to change password', 'Password Error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-100 pb-4">
        <h2 className="text-lg font-semibold text-foreground-950">Security</h2>
        <p className="mt-1 text-sm text-foreground-600">Manage your password and security settings</p>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <RiLockPasswordLine className="size-5 text-foreground-600" />
          <h3 className="text-sm font-medium text-foreground-950">Password</h3>
        </div>

        {showPasswordForm ? (
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label htmlFor={currentPasswordId} className="mb-1.5 block text-sm font-medium text-foreground-700">
                Current Password
              </label>
              <Input
                id={currentPasswordId}
                type="password"
                value={currentPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                required
                disabled={isChangingPassword}
                className="h-10"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor={newPasswordId} className="mb-1.5 block text-sm font-medium text-foreground-700">
                New Password
              </label>
              <Input
                id={newPasswordId}
                type="password"
                value={newPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
                disabled={isChangingPassword}
                className="h-10"
              />
            </div>

            <div>
              <label htmlFor={confirmPasswordId} className="mb-1.5 block text-sm font-medium text-foreground-700">
                Confirm New Password
              </label>
              <Input
                id={confirmPasswordId}
                type="password"
                value={confirmPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                disabled={isChangingPassword}
                className="h-10"
              />
            </div>

            <p className="text-xs text-foreground-600">Password must be at least 8 characters long</p>

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                variant="primary"
                mode="filled"
                size="sm"
                className="h-9"
              >
                {isChangingPassword ? <RiLoader4Line className="size-4 animate-spin" /> : 'Update Password'}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setShowPasswordForm(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                disabled={isChangingPassword}
                variant="secondary"
                mode="outline"
                size="sm"
                className="h-9"
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RiShieldKeyholeLine className="size-4 text-foreground-600" />
              <span className="text-sm text-foreground-700">••••••••••</span>
            </div>
            <Button
              onClick={() => setShowPasswordForm(true)}
              variant="secondary"
              mode="ghost"
              size="sm"
              className="h-8 gap-1.5"
            >
              <RiEdit2Line className="size-4" />
              Change Password
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

type UserProfileProps = {
  appearance?: any;
  children?: React.ReactNode;
};

export function UserProfile({ children }: UserProfileProps) {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-12">
        <RiLoader4Line className="size-6 animate-spin text-foreground-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-foreground-600">No user data available</p>
      </div>
    );
  }

  const pageLabels = React.Children.toArray(children)
    .filter((child): child is React.ReactElement => React.isValidElement(child))
    .map((child) => (child.props as { label: string }).label)
    .filter(Boolean);

  const showProfile = !pageLabels.length || pageLabels[0] === 'account';
  const showSecurity = !pageLabels.length || pageLabels[0] === 'security';

  return (
    <div className="space-y-8">
      {showProfile && <ProfileSection />}
      {showSecurity && <SecuritySection />}
    </div>
  );
}

UserProfile.Page = function Page({ label }: { label: string }) {
  return null;
};
