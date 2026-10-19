import { useOrganization } from '@clerk/react';
import type { ProductUseCases } from '@novu/shared';
import { useMutation } from '@tanstack/react-query';
import { updateExternalOrganization } from '@/api/organization';

export function useUpdateProductUseCases() {
  const { organization } = useOrganization();

  return useMutation<unknown, Error, ProductUseCases>({
    mutationFn: async (productUseCases) => updateExternalOrganization({ productUseCases }),
    onSuccess: async () => {
      // The API persists productUseCases to Clerk publicMetadata (and Mongo). Reload Clerk so
      // useAuth().currentOrganization reflects the change.
      await organization?.reload();
    },
  });
}
