export function sendGTMEvent(event: string, data?: Record<string, unknown>) {
  const dataLayer = (window as { dataLayer?: Record<string, unknown>[] }).dataLayer;
  if (!dataLayer) return;

  dataLayer.push({ event, ...data });
}

export function getUtmParams(): Record<string, string> {
  const searchParams = new URLSearchParams(window.location.search);
  const utmParams: Record<string, string> = {};

  searchParams.forEach((value, key) => {
    if (key.startsWith('utm_')) {
      utmParams[key] = value;
    }
  });

  return utmParams;
}

export function getReferrer(): string {
  return document.referrer || '';
}
