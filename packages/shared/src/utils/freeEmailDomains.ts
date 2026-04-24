const FREE_EMAIL_DOMAINS: Set<string> = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'icloud.com',
  'proton.me',
  'protonmail.com',
  '163.com',
  'qq.com',
  'mail.ru',
  'aol.com',
]);

const DISPOSABLE_EMAIL_DOMAINS: Set<string> = new Set([
  'minitts.net',
  'azsc.us',
  'emaildisruptor.com',
  'skymail.ink',
  'tutamail.com',
  'kksk.uk',
  'gtempaccount.com',
  'privaterelay.appleid.com',
]);

function extractDomain(email: string): string {
  const parts = email.toLowerCase().split('@');

  return parts[1] || '';
}

function isEduDomain(domain: string): boolean {
  return domain.includes('.edu.');
}

export function isFreeEmail(email: string): boolean {
  const domain = extractDomain(email);

  return FREE_EMAIL_DOMAINS.has(domain) || isEduDomain(domain);
}

export function isDisposableEmail(email: string): boolean {
  const domain = extractDomain(email);

  return DISPOSABLE_EMAIL_DOMAINS.has(domain);
}

export function isBusinessEmail(email: string): boolean {
  return !isFreeEmail(email) && !isDisposableEmail(email);
}

export { FREE_EMAIL_DOMAINS, DISPOSABLE_EMAIL_DOMAINS };
