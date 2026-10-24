import { contentStructuredData, type PageContent, SITE_ORIGIN, type SitePage, siteStructuredData } from '@/lib/seo';

type SiteStructuredDataProps = { page: SitePage; content?: never } | { content: PageContent; page?: never };

/**
 * What search engines read about the page (JSON-LD), and where language models find `/llms.txt`. One of the
 * two website pages by name, or any other website page, such as a host's, by what it says about itself.
 */
export function SiteStructuredData({ page, content }: SiteStructuredDataProps) {
  const data = page ? siteStructuredData(page) : contentStructuredData(content);

  return (
    <>
      {/* React puts this link in the head. */}
      <link rel="describedby" type="text/plain" href={`${SITE_ORIGIN}/llms.txt`} />
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is the script's text; `<` is escaped, so it can't end the script early
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(data).replace(/</g, '\\u003c'),
        }}
      />
    </>
  );
}
