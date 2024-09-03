export function openInNewTab(url: string) {
  return window.open(url, '_blank', 'noreferrer noopener');
}

export function validateURL(url: string, msg = 'The provided URL is invalid'): asserts url {
  try {
    // eslint-disable-next-line no-new
    new URL(url || '');
  } catch (err) {
    throw new Error(msg);
  }
}

const ALLOWED_PROTOCOLS = ['http:', 'https:'];

export function assertProtocol(url: URL | string | null) {
  if (!url) {
    return;
  }

  if (typeof url === 'string') {
    // eslint-disable-next-line no-param-reassign
    url = new URL(url);
  }

  if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
    throw new Error(`Novu: "${url.protocol}" protocol from "${url}" is not allowed.`);
  }
}
