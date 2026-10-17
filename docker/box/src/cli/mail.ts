
import type * as z from 'zod';
import { fetchJson } from '../node/http.ts';
import { HtmlCheck, LinkCheck, type MailAddress, MailList, MailMessage } from '../shared/contracts.ts';

const ID = /^[A-Za-z0-9]{18,26}$/;

export interface MailOptions {
  readonly mailUrl: string;
  readonly args: ReadonlyArray<string>;
  readonly limit: number;
  readonly html: boolean;
  readonly checkLinks: boolean;
}

type Api = <T>(path: string, schema: z.ZodType<T>) => Promise<T>;

export async function mail({ mailUrl, args, limit, html, checkLinks }: MailOptions): Promise<number> {
  const api: Api = (path, schema) =>
    fetchJson(`${mailUrl}/api/v1${path}`, schema).catch((error: Error) => {
      throw new Error(`Mailpit ${path}: ${error.message}`);
    });
  const [first, ...rest] = args;
  if (first && !rest.length && ID.test(first)) return show(api, mailUrl, first, html, checkLinks);
  const query = args.join(' ');
  const path = query ? `/search?query=${encodeURIComponent(query)}&limit=${limit}` : `/messages?limit=${limit}`;
  const { messages, messages_count: count, total } = await api(path, MailList);
  if (!messages.length) {
    console.log(query ? `no messages match "${query}"` : 'no messages yet');

    return 0;
  }
  for (const message of messages)
    console.log(
      [
        message.Created.slice(0, 19).replace('T', ' '),
        channel(message.Tags).padEnd(5),
        recipients(message.To).padEnd(28),
        oneLine(message.Subject, 70),
        `(${message.ID})`,
      ].join('  ')
    );
  console.log(`${messages.length} of ${count ?? total}; \`box mail <id>\` shows one`);

  return 0;
}

async function show(api: Api, mailUrl: string, id: string, html: boolean, checkLinks: boolean): Promise<number> {
  const message = await api(`/message/${id}`, MailMessage);
  if (html) {
    console.log(message.HTML || '(no HTML part)');

    return 0;
  }
  const field = (name: string, value: string | undefined) => value && console.log(`${name.padEnd(12)}${value}`);
  field('id', message.ID);
  field('channel', channel(message.Tags));
  field('date', message.Date);
  field('from', address(message.From));
  field('to', recipients(message.To));
  field('cc', recipients(message.Cc));
  field('subject', oneLine(message.Subject, 200));
  for (const file of message.Attachments ?? [])
    field('attachment', `${file.FileName} (${file.ContentType}, ${file.Size} bytes)`);
  if (message.HTML) {
    field('view', `${mailUrl}/view/${id}.html  (the HTML alone; open it in a browser to screenshot)`);
    await htmlCheck(api, id);
    const links = [...new Set([...message.HTML.matchAll(/href="([^"]+)"/g)].map((match) => match[1]))];
    if (links.length) console.log(`\nlinks (${links.length}):\n${links.map((link) => `  ${link}`).join('\n')}`);
  }
  if (checkLinks) {
    const { Errors: errors, Links: checked } = await api(`/message/${id}/link-check`, LinkCheck);
    console.log(`\nlink check: ${errors} broken of ${checked.length}`);
    for (const link of checked.filter((l) => l.StatusCode >= 400 || !l.StatusCode))
      console.log(`  ${link.Status ?? link.StatusCode}  ${link.URL}`);
  }
  console.log(`\n--- text ---\n${message.Text.trim() || '(no text part)'}`);

  return 0;
}

async function htmlCheck(api: Api, id: string): Promise<void> {
  const { Total: total, Warnings: warnings } = await api(`/message/${id}/html-check`, HtmlCheck);
  const percent = (n: number) => `${n.toFixed(0)}%`;
  console.log(
    `\nhtml check: ${percent(total.Supported)} supported, ${percent(total.Partial)} partial, ` +
      `${percent(total.Unsupported)} unsupported (${total.Tests} tests across email clients)`
  );
  for (const warning of warnings ?? []) {
    const clients = (support: string) => [
      ...new Set(warning.Results.filter((r) => r.Support === support).map((r) => `${r.Family} (${r.Platform})`)),
    ];
    const no = clients('no');
    const partial = clients('partial');
    console.log(`  ${warning.Title} (${warning.Score.Found}x): ${warning.URL}`);
    if (no.length) console.log(`    not supported: ${no.join(', ')}`);
    if (partial.length) console.log(`    partly: ${partial.join(', ')}`);
  }
}

function oneLine(text: string, max: number): string {
  const flat = text.replace(/\s+/g, ' ').trim();

  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

function channel(tags: ReadonlyArray<string> | null | undefined): string {
  return ['sms', 'push', 'chat'].find((tag) => tags?.includes(tag)) ?? 'email';
}

function address(person: MailAddress | null | undefined): string {
  if (!person?.Address) return '';

  return person.Name ? `${person.Name} <${person.Address}>` : person.Address;
}

function recipients(people: ReadonlyArray<MailAddress> | null | undefined): string {
  return (people ?? []).map(address).join(', ');
}
