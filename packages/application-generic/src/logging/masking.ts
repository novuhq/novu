import MaskData from 'maskdata';

const cardFields = ['credit', 'debit', 'creditCard', 'debitCard'];

const emailFields = ['primaryEmail', 'secondaryEmail', 'email', 'to', 'from'];

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

const uuidFields = [];

const sensitiveFields = cardFields.concat(
  emailFields,
  passwordFields,
  phoneFields,
  addressFields,
  uuidFields
);

function isSecureField(field: string): boolean {
  return sensitiveFields.includes(field);
}

function maskValueHelper(name: string, value: any) {
  if (cardFields.includes(name)) {
    return maskCardNumber(value);
  } else if (emailFields.includes(name)) {
    return maskEmail(value);
  } else if (uuidFields.includes(name)) {
    return maskUUID(value);
  } else if (addressFields.includes(name)) {
    return maskAddress(value);
  } else if (phoneFields.includes(name)) {
    return maskPhoneNumber(value);
  } else {
    return maskPassword(value);
  }
}

export function maskValue(name: string, value: any) {
  if (process.env.EXPOSE === 'true') {
    return value;
  } else if (typeof value === 'object') {
    const object = {};
    for (const key of Object.keys(value)) {
      object[key] = maskValue(key, value[key]);
    }

    return object;
  } else if (isSecureField(name)) {
    return maskValueHelper(name, value);
  } else {
    return value;
  }
}

const jsonMaskConfig = {
  cardFields,
  emailFields,
  passwordFields,
  phoneFields,
  addressFields,
  uuidFields,
  stringMaskOptions: {
    maskWith: '*',
    maskOnlyFirstOccurance: false,
    values: ['This'],
  },
};

const maskCardOptions = {
  maskWith: '*',
  unmaskedStartDigits: 4,
  unmaskedEndDigits: 0,
};

const maskUuidOptions = {
  maskWith: '*',
  unmaskedStartCharacters: 0,
  unmaskedEndCharacters: 0,
};

const emailMask2Options = {
  maskWith: '*',
  unmaskedStartCharactersBeforeAt: 3,
  unmaskedEndCharactersAfterAt: 257,
  maskAtTheRate: false,
};

const maskPasswordOptions = {
  maskWith: '*',
  // largest password is 124 in MS AAD
  maxMaskedCharacters: 254,
  unmaskedStartCharacters: 0,
  unmaskedEndCharacters: 0,
};

const maskPhoneOptions = {
  maskWith: '*',
  unmaskedStartDigits: 0,
  unmaskedEndDigits: 4,
};

const addressMaskOptions = {
  maskWith: '*',
  maskOnlyFirstOccurance: false,
  values: [],
  maskAll: true,
  maskSpace: false,
};

export function maskAddress(value: string) {
  return MaskData.maskString(value, addressMaskOptions);
}

export function maskCardNumber(value: string) {
  return MaskData.maskCard(value, maskCardOptions);
}

export function maskEmail(value: string) {
  return MaskData.maskEmail2(value, emailMask2Options);
}

export function maskPassword(value: string) {
  return MaskData.maskPassword(value, maskPasswordOptions);
}

export function maskPhoneNumber(value: string) {
  return MaskData.maskPhone(value, maskPhoneOptions);
}

export function maskUUID(value: string) {
  return MaskData.maskUuid(value, maskUuidOptions);
}

export function maskJSON(value: object) {
  return MaskData.maskJSON2(value, jsonMaskConfig);
}
