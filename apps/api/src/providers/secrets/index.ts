import { EmailProviderIdEnum } from '@novu/shared';
import axios from 'axios';

const getDopplerSecrets = async () => {
  const response = await axios.get(
    `https://${process.env.DOPPLER_TOKEN}@api.doppler.com/v3/configs/config/secrets/download?format=json`
  );

  return response.data;
};

export const injectDopplerSecrets = async (): Promise<void> => {
  const dopplerSecrets = await getDopplerSecrets();

  const providerSecrets = Object.entries(dopplerSecrets).filter((dopplerSecret): boolean => {
    return dopplerSecret[0].startsWith('REGRESSION_');
  });

  for (const [key, value] of providerSecrets) {
    process.env[key] = `${value}`;
  }
};

export const getProviderSecrets = (providerId: EmailProviderIdEnum): Record<string, string> => {
  const providers = {
    [EmailProviderIdEnum.SendGrid]: {
      apiKey: process.env.REGRESSION_SENDGRID_API_KEY,
      secretKey: process.env.REGRESSION_SENDGRID_SECRET_KEY,
    },
  };

  const secrets = providers[providerId];

  if (!secrets) {
    throw new Error(`Missing secrets for provider ${providerId} in regression test suite`);
  }

  return secrets;
};
