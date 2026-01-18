import { PermissionsEnum } from '@novu/shared';
import * as React from 'react';
import { useState } from 'react';
import { RiEdit2Line, RiLoader4Line, RiOrganizationChart } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { authClient } from '../client';
import { useAuth, useOrganization } from '../index';

export function OrganizationSettings() {
  const { organization, isLoaded } = useOrganization();
  const { refreshSession, has } = useAuth();
  const canEditSettings = has({ permission: PermissionsEnum.ORG_SETTINGS_WRITE });
  const [isEditingName, setIsEditingName] = useState(false);
  const [organizationName, setOrganizationName] = useState(organization?.name || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentOrgData, setCurrentOrgData] = useState(organization);

  React.useEffect(() => {
    if (!isEditingName) {
      setCurrentOrgData(organization);
      setOrganizationName(organization?.name || '');
    }
  }, [organization, isEditingName]);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationName.trim() || organizationName === currentOrgData?.name || !currentOrgData?.id) {
      setIsEditingName(false);

      return;
    }

    setIsUpdating(true);
    try {
      const newSlug = organizationName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      const { error } = await authClient.organization.update({
        organizationId: currentOrgData.id,
        data: {
          name: organizationName.trim(),
          slug: newSlug,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to update organization');
      }

      await authClient.organization.setActive({
        organizationId: currentOrgData.id,
      });

      showSuccessToast('Organization name updated successfully', 'Organization Updated');
      setIsEditingName(false);

      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (e: any) {
      console.error('Failed to update organization:', e);
      showErrorToast(e.message || 'Failed to update organization', 'Update Error');
      setOrganizationName(currentOrgData?.name || '');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-12">
        <RiLoader4Line className="size-6 animate-spin text-foreground-600" />
      </div>
    );
  }

  if (!currentOrgData) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-foreground-600">No organization data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <RiOrganizationChart className="size-5 text-foreground-600" />
          <h3 className="text-sm font-medium text-foreground-950">Organization Name</h3>
        </div>

        {isEditingName ? (
          <form onSubmit={handleUpdateName} className="space-y-3">
            <Input
              type="text"
              value={organizationName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrganizationName(e.target.value)}
              placeholder="Enter organization name"
              required
              disabled={isUpdating}
              className="h-10"
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={isUpdating || !organizationName.trim()}
                variant="primary"
                mode="filled"
                size="sm"
                className="h-9"
              >
                {isUpdating ? <RiLoader4Line className="size-4 animate-spin" /> : 'Save'}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setIsEditingName(false);
                  setOrganizationName(currentOrgData.name || '');
                }}
                disabled={isUpdating}
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
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground-950">{currentOrgData.name}</span>
              <span className="text-xs text-foreground-600">Slug: {currentOrgData.slug}</span>
            </div>
            {canEditSettings && (
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
            )}
          </div>
        )}
      </div>
    </div>
  );
}
