export function openInNewTab(url: string) {
  return window.open(url, '_blank', 'noreferrer noopener');
}

export function validateURL(url: string, msg = 'The provided URL is invalid'): asserts url {
  try {
    new URL(url || '');
  } catch (err) {
    throw new Error(msg);
  }
}
