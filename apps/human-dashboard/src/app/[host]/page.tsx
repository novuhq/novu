import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { HostPage } from '@/components/hosts/host-page';
import { SiteStructuredData } from '@/components/seo/site-structured-data';
import { hostPageContent, hostPageMetadata } from '@/lib/host-seo';
import { HOST_IDS, hostOf, isHostId } from '@/lib/hosts';

/** Only the hosts in the list have a page: any other address at this level is not found. */
export const dynamicParams = false;

export function generateStaticParams() {
  return HOST_IDS.map((host) => ({ host }));
}

export async function generateMetadata(props: PageProps<'/[host]'>): Promise<Metadata> {
  const { host } = await props.params;

  return isHostId(host) ? hostPageMetadata(hostOf(host)) : {};
}

/**
 * A host's public page, `/claude-code`, built when the site is: what to tell the agent, then the steps, the
 * same as the dashboard's (`HostPage`). Its Markdown for agents is `/claude-code.md` (`./index.md`). Every
 * page of the site at this level that isn't a host (`/sapien`, `/connect`, …) is its own route, which wins.
 */
export default async function Page(props: PageProps<'/[host]'>) {
  const { host } = await props.params;
  if (!isHostId(host)) {
    notFound();
  }

  return (
    <>
      <SiteStructuredData content={hostPageContent(hostOf(host))} />
      <HostPage hostId={host} />
    </>
  );
}
