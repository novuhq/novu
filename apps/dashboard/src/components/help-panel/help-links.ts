const DOCS_BASE_URL = 'https://docs.novu.co';
const UTM_SUFFIX = '?utm_campaign=support_drawer';

export const BOOK_DEMO_URL = `https://cal.com/team/novu/intro${UTM_SUFFIX}`;
export const CHANGELOG_URL = `https://go.novu.co/changelog${UTM_SUFFIX}`;

export function docsUrl(path = '') {
  const [basePath, hash] = path.split('#');
  const url = `${DOCS_BASE_URL}${basePath}${UTM_SUFFIX}`;

  return hash ? `${url}#${hash}` : url;
}
