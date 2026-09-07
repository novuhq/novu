const PLUS_ONLY = /\+.*$/;
const PLUS_AND_DOT = /\.|\+.*$/g;
const normalizableProviders = {
  'gmail.com': {
    cut: PLUS_AND_DOT,
    aliasOf: '',
  },
  'googlemail.com': {
    cut: PLUS_AND_DOT,
    aliasOf: 'gmail.com',
  },
  'hotmail.com': {
    cut: PLUS_ONLY,
    aliasOf: '',
  },
  'live.com': {
    cut: PLUS_AND_DOT,
    aliasOf: '',
  },
  'outlook.com': {
    cut: PLUS_ONLY,
    aliasOf: '',
  },
} as const;

type NormalizableProvider = keyof typeof normalizableProviders;

export function normalizeEmail(email: string): string {
  if (typeof email !== 'string') {
    throw new TypeError('normalize-email expects a string');
  }

  const lowerCasedEmail = email.toLowerCase();
  const emailParts = lowerCasedEmail.split(/@/);

  if (emailParts.length !== 2) {
    return email;
  }

  let username = emailParts[0] || '';
  let domain = emailParts[1] || '';

  if (normalizableProviders.hasOwnProperty(domain)) {
    if (normalizableProviders[domain as NormalizableProvider].cut) {
      username = username.replace(normalizableProviders[domain as NormalizableProvider].cut, '');
    }

    if (normalizableProviders[domain as NormalizableProvider].aliasOf) {
      domain = normalizableProviders[domain as NormalizableProvider].aliasOf;
    }
  }

  return `${username}@${domain}`;
}
