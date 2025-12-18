import { useState, useEffect } from 'react';
import { authClient } from '../client';

export function OrganizationSwitcher() {
  const [currentOrg, setCurrentOrg] = useState<any>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: session } = await authClient.getSession();
      const activeOrgId = session?.session?.activeOrganizationId;

      const { data: orgs } = await authClient.organization.list();
      setOrganizations(orgs || []);

      if (activeOrgId) {
        const active = orgs?.find((org: any) => org.id === activeOrgId);
        setCurrentOrg(active);
      }
    } catch (e: any) {
      console.error('Failed to load organization data:', e);
    }
  };

  const handleSwitch = async (organizationId: string) => {
    try {
      await authClient.organization.setActive({
        organizationId,
      });
      setIsOpen(false);
      window.location.reload();
    } catch (e: any) {
      console.error('Failed to switch organization:', e);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded border px-3 py-2 hover:bg-gray-50"
      >
        <span className="text-sm font-medium">
          {currentOrg?.name || 'Select Organization'}
        </span>
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-10 mt-1 w-64 rounded border bg-white shadow-lg">
          <div className="max-h-64 overflow-y-auto p-2">
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => handleSwitch(org.id)}
                className="w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-100"
              >
                <div className="font-medium">{org.name}</div>
                <div className="text-xs text-gray-500">{org.slug}</div>
              </button>
            ))}
            {organizations.length === 0 && (
              <p className="px-3 py-2 text-sm text-gray-500">No organizations</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
