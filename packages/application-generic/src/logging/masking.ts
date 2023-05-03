const cardFields = ['credit', 'debit', 'creditCard', 'debitCard'];

const emailFields = ['primaryEmail', 'secondaryEmail', 'email'];

const passwordFields = [
  'password',
  'token',
  'apiKey',
  'apiKeys',
  'secretKey',
  'firstName',
  'lastName',
  'organizationName',
  'senderName',
  'username',
];

const phoneFields = ['homePhone', 'workPhone', 'phone'];

const addressFields = [
  'addressLine1',
  'addressLine2',
  'address',
  'cardAddress',
];

const httpFields = ['webhookUrl', 'avatar', 'avatar_url'];

const uuidFields = [];

export const sensitiveFields = cardFields.concat(
  emailFields,
  passwordFields,
  phoneFields,
  addressFields,
  uuidFields,
  httpFields
);
