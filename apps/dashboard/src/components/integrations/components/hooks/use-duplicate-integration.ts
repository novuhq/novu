import {
  EnvironmentTypeEnum,
  getUnusedTwilioAuthCredentialKeys,
  type ICredentials,
  type IEnvironment,
  type IIntegration,
  type IProviderConfig,
  SmsProviderIdEnum,
  secureCredentials,
} from '@novu/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createIntegration } from '@/api/integrations';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';

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
      // The keys the API encrypts at rest, so `headers` (which can carry an auth token) is left behind too.
      const secretKeys = new Set<string>(secureCredentials);
      const source = Object.entries(integration.credentials ?? {}).filter(([, value]) => hasValue(value));
      const credentials = Object.fromEntries(source.filter(([key]) => copySecrets || !secretKeys.has(key)));

      // A secret the source uses didn't come along, even an optional one (MS Teams' bot app needs its secretKey).
      const droppedSecret = source.some(([key]) => !hasValue(credentials[key]));
      // Members who can't read credentials get them back empty. Twilio needs only its chosen auth method's keys.
      const unusedKeys = new Set<string>(
        provider.id === SmsProviderIdEnum.Twilio
          ? getUnusedTwilioAuthCredentialKeys(credentials.authMethod as string | undefined)
          : []
      );
      const missingRequiredSecret = provider.credentials.some(
        (cred) =>
          secretKeys.has(cred.key) && cred.required && !unusedKeys.has(cred.key) && !hasValue(credentials[cred.key])
      );
      const needsSecrets = droppedSecret || missingRequiredSecret;

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
