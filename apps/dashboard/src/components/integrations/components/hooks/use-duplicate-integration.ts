import {
  ChatProviderIdEnum,
  CredentialsKeyEnum,
  EnvironmentTypeEnum,
  getUnusedTwilioAuthCredentialKeys,
  type IConfigurations,
  type ICredentials,
  type IEnvironment,
  type IIntegration,
  type IProviderConfig,
  PushProviderIdEnum,
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
/** Legacy FCM integrations keep the whole service account JSON, private key included, in `user`. */
const FCM_SECRET_CREDENTIAL_KEYS = new Set<string>([...SECRET_CREDENTIAL_KEYS, CredentialsKeyEnum.User]);
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

/** The credentials the copy gets, and whether it still needs secrets pasted before it can send. */
function getCopiedCredentials(integration: IIntegration, provider: IProviderConfig, copySecrets: boolean) {
  const secretKeys = provider.id === PushProviderIdEnum.FCM ? FCM_SECRET_CREDENTIAL_KEYS : SECRET_CREDENTIAL_KEYS;
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
  // A WhatsApp number connected by Embedded Signup runs on Novu's Meta app, whose secret the copy uses too.
  if (provider.id === ChatProviderIdEnum.WhatsAppBusiness && credentials.isNovuManaged === true) {
    unusedKeys.add(CredentialsKeyEnum.SecretKey);
  }
  const missingRequiredSecret = provider.credentials.some(
    (cred) => secretKeys.has(cred.key) && cred.required && !unusedKeys.has(cred.key) && !hasValue(credentials[cred.key])
  );
  const needsSecrets = droppedSecret || missingRequiredSecret;
  // The API rejects Twilio's API key method without its key and secret, so a copy without them starts on the
  // default method; the member picks API key again when they paste the secrets.
  if (
    provider.id === SmsProviderIdEnum.Twilio &&
    credentials.authMethod === 'apiKey' &&
    (!hasValue(credentials.apiKey) || !hasValue(credentials.secretKey))
  ) {
    delete credentials.authMethod;
  }

  return { credentials, needsSecrets };
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
      const { credentials, needsSecrets } = getCopiedCredentials(integration, provider, copySecrets);
      const configurations: IConfigurations = Object.fromEntries(
        Object.entries(integration.configurations ?? {}).filter(
          ([key]) => copySecrets || !SECRET_CONFIGURATION_KEYS.has(key)
        )
      );
      // Some providers accept unsigned webhooks when the key is missing, so inbound delivery events stay off until
      // the copy has its own signing key. Sending isn't affected.
      if (integration.configurations?.inboundWebhookSigningKey && !configurations.inboundWebhookSigningKey) {
        configurations.inboundWebhookEnabled = false;
      }

      const { data } = await createIntegration(
        {
          providerId: integration.providerId,
          channel: integration.channel,
          kind: integration.kind,
          name: integration.name,
          identifier: integration.identifier,
          credentials,
          // The API only returns secrets masked, so it copies the stored ones from the source itself.
          ...(copySecrets ? { secretsSourceIntegrationId: integration._id } : {}),
          // The request type says strings, but configurations also hold flags like inboundWebhookEnabled.
          configurations: configurations as Record<string, string>,
          // Without its secrets the copy can't send, so it waits paused instead of failing every step.
          active: integration.active && !needsSecrets,
          // The same routing, so a conditional integration keeps matching only the traffic it was meant for.
          rules: integration.rules ?? null,
          ...(!integration.rules && integration.conditions?.length ? { conditions: integration.conditions } : {}),
          _environmentId: target._id,
        },
        currentEnvironment
      );

      return { integration: data, environment: target, needsSecrets };
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchIntegrations] }),
  });
}
