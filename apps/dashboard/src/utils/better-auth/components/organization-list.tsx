import { useEffect, useState } from 'react';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import { authClient } from '../client';

export function OrganizationList() {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      const { data } = await authClient.organization.list();
      setOrganizations(data || []);
    } catch (e: any) {
      console.error('Failed to load organizations:', e);
    }
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { data, error: createError } = await authClient.organization.create({
        name: newOrgName,
        slug: newOrgName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      });

      if (createError) {
        throw new Error(createError.message || 'Failed to create organization');
      }

      setNewOrgName('');
      setShowCreateForm(false);
      await loadOrganizations();
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetActive = async (organizationId: string) => {
    try {
      await authClient.organization.setActive({
        organizationId,
      });
      window.location.reload();
    } catch (e: any) {
      console.error('Failed to set active organization:', e);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Organizations</h2>
        <Button variant="primary" mode="filled" size="sm" onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? 'Cancel' : 'Create New'}
        </Button>
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreateOrganization} className="space-y-3 rounded border-neutral-200 p-4">
          <div>
            <label htmlFor="orgName" className="mb-1 block text-sm font-medium">
              Organization Name
            </label>
            <Input
              id="orgName"
              value={newOrgName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewOrgName(e.target.value)}
              placeholder="My Organization"
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={isLoading} variant="primary" mode="filled" size="sm">
            {isLoading ? 'Creating...' : 'Create Organization'}
          </Button>
        </form>
      )}

      <div className="space-y-2">
        {organizations.map((org) => (
          <div key={org.id} className="flex items-center justify-between rounded border-neutral-200 p-3">
            <div>
              <p className="font-medium">{org.name}</p>
              <p className="text-sm text-foreground-500">{org.slug}</p>
            </div>
            <Button variant="secondary" mode="outline" size="sm" onClick={() => handleSetActive(org.id)}>
              Switch To
            </Button>
          </div>
        ))}
        {organizations.length === 0 && !showCreateForm && (
          <p className="text-center text-foreground-500">No organizations found</p>
        )}
      </div>
    </div>
  );
}
