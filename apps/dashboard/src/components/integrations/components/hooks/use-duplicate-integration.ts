import {
  EnvironmentTypeEnum,
  type ICredentials,
  type IEnvironment,
  type IIntegration,
  type IProviderConfig,
} from '@novu/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createIntegration } from '@/api/integrations';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';
import { isSecureCredential } from '../utils/helpers';

/** An environment the integration can be copied into, and the copy already there, if any. */
export type DuplicateTarget = {
  environment: IEnvironment;
  existing?: IIntegration;
};

export type DuplicateResult = {
  integration: IIntegration;
  environment: IEnvironment;
  /** Secrets weren't copied (or weren't readable), so the copy is paused until they're pasted. */
  needsSecrets: boolean;
};

const isLive = (environment?: IEnvironment) => environment?.type === EnvironmentTypeEnum.PROD;

/** Secrets from a live environment stay there: a development environment gets the rest of the settings only. */
export function shouldCopySecrets(source?: IEnvironment, target?: IEnvironment) {
  return !(isLive(source) && !isLive(target));
}

/**
 * The other environments, with the integration that shares this one's identifier in each. Integrations aren't
 * linked across environments, so the copy keeps the identifier and the drawer matches them by it.
 */
export function getDuplicateTargets(
  integration: IIntegration,
  environments: IEnvironment[],
  matches: IIntegration[]
): DuplicateTarget[] {
  return environments
    .filter((environment) => environment._id !== integration._environmentId)
    .map((environment) => ({
      environment,
      existing: matches.find((item) => item._environmentId === environment._id),
    }));
}

function hasValue(value: ICredentials[keyof ICredentials]) {
  return value !== undefined && value !== null && value !== '';
}

/** Creates the same integration — provider, name, identifier, settings and credentials — in another environment. */
export function useDuplicateIntegration({
  integration,
  provider,
  sourceEnvironment,
}: {
  integration?: IIntegration;
  provider?: IProviderConfig;
  sourceEnvironment?: IEnvironment;
}) {
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();

  return useMutation({
    mutationFn: async (target: IEnvironment): Promise<DuplicateResult> => {
      if (!currentEnvironment) throw new Error('No environment selected');
      if (!integration || !provider) throw new Error('Integration not found');

      const copySecrets = shouldCopySecrets(sourceEnvironment, target);
      const secretKeys = new Set<string>(provider.credentials.filter(isSecureCredential).map((cred) => cred.key));
      const credentials = Object.fromEntries(
        Object.entries(integration.credentials ?? {}).filter(
          ([key, value]) => hasValue(value) && (copySecrets || !secretKeys.has(key))
        )
      );
      // Members who can't read credentials get them back empty, so the copy can be missing secrets either way.
      const needsSecrets = provider.credentials.some(
        (cred) => isSecureCredential(cred) && cred.required && !hasValue(credentials[cred.key])
      );

      const { data } = await createIntegration(
        {
          providerId: integration.providerId,
          channel: integration.channel,
          kind: integration.kind,
          name: integration.name,
          identifier: integration.identifier,
          credentials,
          configurations: integration.configurations as Record<string, string> | undefined,
          // Without its secrets the copy can't send, so it waits paused instead of failing every step.
          active: integration.active && !needsSecrets,
          _environmentId: target._id,
        },
        currentEnvironment
      );

      return { integration: data, environment: target, needsSecrets };
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchIntegrations] }),
  });
}
