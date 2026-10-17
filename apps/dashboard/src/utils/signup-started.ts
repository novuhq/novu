import { type KeylessCreationSource, SignupSourceEnum } from '@novu/shared';

export type SignupStartedProperties = {
  source: SignupSourceEnum;
  client?: string;
};

type KeylessClaimSource = {
  source: KeylessCreationSource;
  client?: string;
};

type ClaimSourceLookup = (token: string) => Promise<KeylessClaimSource>;

/**
 * A sign-up page visit is a dashboard signup, unless it's the way back to a claim link: then the signup
 * belongs to whoever created the keyless environment (inbox, agent, …). A lookup that fails keeps it a
 * dashboard signup rather than losing the event.
 */
export async function resolveSignupStartedProperties(
  claimToken: string | null,
  lookupClaimSource: ClaimSourceLookup
): Promise<SignupStartedProperties> {
  if (!claimToken) {
    return { source: SignupSourceEnum.DASHBOARD };
  }

  try {
    const { source, client } = await lookupClaimSource(claimToken);

    return client ? { source, client } : { source };
  } catch {
    return { source: SignupSourceEnum.DASHBOARD };
  }
}
