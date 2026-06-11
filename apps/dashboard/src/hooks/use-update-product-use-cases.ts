import type { ProductUseCases } from '@novu/shared';
import { useMutation } from '@tanstack/react-query';
import { updateExternalOrganization } from '@/api/organization';

export function useUpdateProductUseCases() {
  return useMutation<unknown, Error, ProductUseCases>({
    mutationFn: async (productUseCases) => updateExternalOrganization({ productUseCases }),
  });
}
