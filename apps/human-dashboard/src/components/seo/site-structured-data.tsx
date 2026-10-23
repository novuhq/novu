import { SITE_ORIGIN, type SitePage, siteStructuredData } from '@/lib/seo';

/** What search engines read about the page (JSON-LD), and where language models find `/llms.txt`. */
export function SiteStructuredData({ page }: { page: SitePage }) {
  return (
    <>
      {/* React puts this link in the head. */}
      <link rel="describedby" type="text/plain" href={`${SITE_ORIGIN}/llms.txt`} />
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is the script's text; `<` is escaped, so it can't end the script early
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(siteStructuredData(page)).replace(/</g, '\\u003c'),
        }}
      />
    </>
  );
}
