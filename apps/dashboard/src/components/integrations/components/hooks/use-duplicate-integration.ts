import {
  CredentialsKeyEnum,
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

/**
 * Credentials that stay in live environments: what the API encrypts at rest (including `headers`, which can carry
 * an auth token), plus provider material it stores as plain settings — Azure SMS connection strings and MessageBird
 * keys (`accessKey`) and custom SMTP client keys (`tlsOptions`).
 */
const SECRET_CREDENTIAL_KEYS = new Set<string>([
  ...secureCredentials,
  CredentialsKeyEnum.AccessKey,
  CredentialsKeyEnum.TlsOptions,
]);
/** Settings that are secrets too: the key the provider signs inbound delivery webhooks with. */
const SECRET_CONFIGURATION_KEYS = new Set<string>(['inboundWebhookSigningKey']);

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
      const secretKeys = SECRET_CREDENTIAL_KEYS;
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
      // Without its signing key the copy still sends; inbound delivery events wait until it's pasted.
      const configurations = Object.fromEntries(
        Object.entries(integration.configurations ?? {}).filter(
          ([key]) => copySecrets || !SECRET_CONFIGURATION_KEYS.has(key)
        )
      ) as Record<string, string>;

      const { data } = await createIntegration(
        {
          providerId: integration.providerId,
          channel: integration.channel,
          kind: integration.kind,
          name: integration.name,
          identifier: integration.identifier,
          credentials,
          configurations,
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
