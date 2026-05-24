import { useMutation } from '@tanstack/react-query';
import {
  type VerifyManagedCredentialsBody,
  type VerifyManagedCredentialsResponse,
  verifyManagedCredentials,
} from '@/api/agents';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';

export function useVerifyManagedCredentials() {
  const { currentEnvironment } = useEnvironment();

  return useMutation<VerifyManagedCredentialsResponse, Error, VerifyManagedCredentialsBody>({
    mutationFn: (body) =>
      verifyManagedCredentials(requireEnvironment(currentEnvironment, 'No environment selected'), body),
  });
}
