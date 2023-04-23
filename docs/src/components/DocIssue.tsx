import React from 'react';
import { useLocation } from '@docusaurus/router';

export default function DocIssue() {
  const location = useLocation();

  return (
    <p style={{ paddingLeft: '20px' }}>
      Is something broken?{' '}
      <a
        href={`https://github.com/novuhq/novu/issues/new?template=docs_feedback.yml&page-url=https://docs.novu.co${location.pathname}`}
      >
        Please open an issue!
      </a>
    </p>
  );
}
