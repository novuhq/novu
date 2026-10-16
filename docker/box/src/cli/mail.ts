// `box mail`: what the box sent, read from its Mailpit over the box's address. Every email lands there, and the sink
// (src/box/sink.ts) puts SMS, push and chat messages there too, tagged `sms`, `push` or `chat`.
//
//   mail [search]           the newest messages, one line each; search is Mailpit's: to:a@b.c subject:Welcome tag:sms
//   mail <id>               one message: headers, attachments, links, the HTML check, the view URL, the text
//   mail <id> --html        the HTML source instead of the text
//   mail <id> --check-links also request every link (HEAD) and report the broken ones
//
// The HTML check is Mailpit's: each HTML/CSS feature the email uses against caniemail.com's data for the email
// clients (Gmail, Outlook, Apple Mail, ...). The view URL renders the HTML alone, for a browser screenshot.

import { Effect } from 'effect';
import { HttpClient } from 'effect/http';
import { CliError } from './run.ts';

const ID = /^[A-Za-z0-9]{18,26}$/;

// Mailpit's JSON, a few fields of it.
// biome-ignore lint/suspicious/noExplicitAny: Mailpit's API objects
type Json = any;

export interface MailOptions {
  readonly mailUrl: string;
  readonly args: ReadonlyArray<string>;
  readonly limit: number;
  readonly html: boolean;
  readonly checkLinks: boolean;
}

export const mail = Effect.fn('mail')(function* ({ mailUrl, args, limit, html, checkLinks }: MailOptions) {
  const client = yield* HttpClient.HttpClient;
  const api = (path: string): Effect.Effect<Json, CliError> =>
    Effect.gen(function* () {
      const response = yield* client.get(`${mailUrl}/api/v1${path}`);
      if (response.status < 200 || response.status >= 300)
        return yield* new CliError({
          message: `Mailpit ${path} -> ${response.status}: ${(yield* response.text).slice(0, 200)}`,
        });

      return yield* response.json;
    }).pipe(
      Effect.mapError((error) =>
        error instanceof CliError ? error : new CliError({ message: `Mailpit ${path}: ${error.message}` })
      )
    );

  const [first, ...rest] = args;
  if (first && !rest.length && ID.test(first)) return yield* show(api, mailUrl, first, html, checkLinks);
  const query = args.join(' ');
  const {
    messages,
    messages_count: count,
    total,
  } = query
    ? yield* api(`/search?query=${encodeURIComponent(query)}&limit=${limit}`)
    : yield* api(`/messages?limit=${limit}`);
  if (!messages.length) {
    console.log(query ? `no messages match "${query}"` : 'no messages yet');

    return 0;
  }
  for (const message of messages)
    console.log(
      [
        message.Created.slice(0, 19).replace('T', ' '),
        channel(message).padEnd(5),
        recipients(message.To).padEnd(28),
        oneLine(message.Subject, 70),
        `(${message.ID})`,
      ].join('  ')
    );
  console.log(`${messages.length} of ${count ?? total}; \`box mail <id>\` shows one`);

  return 0;
});

const show = Effect.fn('show')(function* (
  api: (path: string) => Effect.Effect<Json, CliError>,
  mailUrl: string,
  id: string,
  html: boolean,
  checkLinks: boolean
) {
  const message = yield* api(`/message/${id}`);
  if (html) {
    console.log(message.HTML || '(no HTML part)');

    return 0;
  }
  const field = (name: string, value: string | undefined) => value && console.log(`${name.padEnd(12)}${value}`);
  field('id', message.ID);
  field('channel', channel(message));
  field('date', message.Date);
  field('from', address(message.From));
  field('to', recipients(message.To));
  field('cc', recipients(message.Cc));
  field('subject', oneLine(message.Subject, 200));
  for (const file of message.Attachments ?? [])
    field('attachment', `${file.FileName} (${file.ContentType}, ${file.Size} bytes)`);
  if (message.HTML) {
    field('view', `${mailUrl}/view/${id}.html  (the HTML alone; open it in a browser to screenshot)`);
    yield* htmlCheck(api, id);
    const links = [...new Set([...String(message.HTML).matchAll(/href="([^"]+)"/g)].map((match) => match[1]))];
    if (links.length) console.log(`\nlinks (${links.length}):\n${links.map((link) => `  ${link}`).join('\n')}`);
  }
  if (checkLinks) {
    const { Errors: errors, Links: checked } = yield* api(`/message/${id}/link-check`);
    console.log(`\nlink check: ${errors} broken of ${checked.length}`);
    for (const link of checked.filter((l: Json) => l.StatusCode >= 400 || !l.StatusCode))
      console.log(`  ${link.Status ?? link.StatusCode}  ${link.URL}`);
  }
  console.log(`\n--- text ---\n${(message.Text ?? '').trim() || '(no text part)'}`);

  return 0;
});

const htmlCheck = Effect.fn('htmlCheck')(function* (api: (path: string) => Effect.Effect<Json, CliError>, id: string) {
  const { Total: total, Warnings: warnings = [] } = yield* api(`/message/${id}/html-check`);
  const percent = (n: number) => `${Number(n).toFixed(0)}%`;
  console.log(
    `\nhtml check: ${percent(total.Supported)} supported, ${percent(total.Partial)} partial, ` +
      `${percent(total.Unsupported)} unsupported (${total.Tests} tests across email clients)`
  );
  for (const warning of warnings) {
    // One entry per client and platform, without versions: "outlook (windows)".
    const clients = (support: string) => [
      ...new Set(
        warning.Results.filter((r: Json) => r.Support === support).map((r: Json) => `${r.Family} (${r.Platform})`)
      ),
    ];
    const no = clients('no');
    const partial = clients('partial');
    console.log(`  ${warning.Title} (${warning.Score.Found}x): ${warning.URL}`);
    if (no.length) console.log(`    not supported: ${no.join(', ')}`);
    if (partial.length) console.log(`    partly: ${partial.join(', ')}`);
  }
});

// Chat and push subjects are the message itself, line breaks included.
function oneLine(text: unknown, max: number): string {
  const flat = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();

  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

function channel(message: Json): string {
  return ['sms', 'push', 'chat'].find((tag) => message.Tags?.includes(tag)) ?? 'email';
}

function address(person: Json): string {
  if (!person?.Address) return '';

  return person.Name ? `${person.Name} <${person.Address}>` : person.Address;
}

function recipients(people: Json): string {
  return (people ?? []).map(address).join(', ');
}
