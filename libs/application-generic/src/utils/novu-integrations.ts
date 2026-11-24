import { env } from '../config/env';
export const areNovuManagedClaudeCredentialsSet = () => {
  return typeof env.NOVU_MANAGED_CLAUDE_API_KEY !== 'undefined' && env.NOVU_MANAGED_CLAUDE_API_KEY !== '';
};

export function getNovuManagedClaudeApiKey(): string {
  const apiKey = env.NOVU_MANAGED_CLAUDE_API_KEY;

  if (!apiKey) {
    throw new Error('NOVU_MANAGED_CLAUDE_API_KEY is not configured');
  }

  return apiKey;
}

export const areNovuEmailCredentialsSet = () => {
  return typeof env.NOVU_EMAIL_INTEGRATION_API_KEY !== 'undefined' && env.NOVU_EMAIL_INTEGRATION_API_KEY !== '';
};

export const areNovuSlackCredentialsSet = () => {
  const isClientIdSet =
    typeof env.NOVU_SLACK_INTEGRATION_CLIENT_ID !== 'undefined' && env.NOVU_SLACK_INTEGRATION_CLIENT_ID !== '';
  const isClientSecretSet =
    typeof env.NOVU_SLACK_INTEGRATION_CLIENT_SECRET !== 'undefined' && env.NOVU_SLACK_INTEGRATION_CLIENT_SECRET !== '';

  return isClientIdSet && isClientSecretSet;
};

export const areNovuSmsCredentialsSet = () => {
  const isAccountSidSet =
    typeof env.NOVU_SMS_INTEGRATION_ACCOUNT_SID !== 'undefined' && env.NOVU_SMS_INTEGRATION_ACCOUNT_SID !== '';
  const isTokenSet = typeof env.NOVU_SMS_INTEGRATION_TOKEN !== 'undefined' && env.NOVU_SMS_INTEGRATION_TOKEN !== '';
  const isSenderSet = typeof env.NOVU_SMS_INTEGRATION_SENDER !== 'undefined' && env.NOVU_SMS_INTEGRATION_SENDER !== '';

  return isAccountSidSet && isTokenSet && isSenderSet;
};
